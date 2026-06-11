'use strict';

const express = require('express');
const {
  validateCreateWorkOrder,
  validateStatusValue,
  isValidTransition,
} = require('../validation');

const SELECT_BY_ID = 'SELECT * FROM work_orders WHERE id = ?';

/**
 * Work order endpoints:
 *   POST /work-orders, GET /work-orders, PATCH /work-orders/:id/status
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {import('express').Router}
 */
function createWorkOrdersRouter(db) {
  const router = express.Router();

  // GET /work-orders — list, optionally filtered by status. Newest-creation order.
  router.get('/', (req, res) => {
    const { status } = req.query;

    if (status !== undefined) {
      const check = validateStatusValue(status);
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }
      const rows = db
        .prepare('SELECT * FROM work_orders WHERE status = ? ORDER BY id ASC')
        .all(status);
      return res.status(200).json(rows);
    }

    const rows = db.prepare('SELECT * FROM work_orders ORDER BY id ASC').all();
    return res.status(200).json(rows);
  });

  // POST /work-orders — create a work order (status defaults to PENDING).
  router.post('/', (req, res) => {
    const result = validateCreateWorkOrder(req.body);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    const { order_no, style_code, qty } = result.value;
    try {
      const info = db
        .prepare('INSERT INTO work_orders (order_no, style_code, qty) VALUES (?, ?, ?)')
        .run(order_no, style_code, qty);
      const row = db.prepare(SELECT_BY_ID).get(info.lastInsertRowid);
      return res.status(201).json(row);
    } catch (err) {
      if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: `order_no ${order_no} already exists` });
      }
      throw err;
    }
  });

  // PATCH /work-orders/:id/status — advance status through the state machine.
  router.patch('/:id/status', (req, res) => {
    // Only a plain run of digits is a valid id; reject hex/scientific/sign forms
    // (Number('0x1') === 1) so they 404 instead of resolving to an unrelated row.
    const idParam = req.params.id;
    const current = /^\d+$/.test(idParam)
      ? db.prepare(SELECT_BY_ID).get(Number(idParam))
      : undefined;
    if (!current) {
      return res.status(404).json({ error: `work order ${idParam} not found` });
    }
    const id = current.id;

    const { status } = req.body || {};
    const check = validateStatusValue(status);
    if (!check.ok) {
      return res.status(400).json({ error: check.error });
    }

    if (!isValidTransition(current.status, status)) {
      return res
        .status(400)
        .json({ error: `cannot change status from ${current.status} to ${status}` });
    }

    db.prepare(
      "UPDATE work_orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
    ).run(status, id);
    const row = db.prepare(SELECT_BY_ID).get(id);
    return res.status(200).json(row);
  });

  return router;
}

module.exports = createWorkOrdersRouter;
