'use strict';

const express = require('express');
const path = require('path');
const createWorkOrdersRouter = require('./routes/workOrders');

/**
 * Build the Express app around an injected DB instance.
 * No port is bound here — server.js calls listen(), tests drive it via supertest.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {import('express').Express}
 */
function createApp(db) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/work-orders', createWorkOrdersRouter(db));

  // Last-resort error handler: keep the JSON error-shape contract instead of
  // letting Express emit an HTML stack trace on an unexpected throw.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
