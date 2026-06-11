'use strict';

const ORDER_NO_RE = /^WO-\d{4}-\d{4}$/;
const STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

// Allowed status state machine. Only these forward transitions are legal.
const TRANSITIONS = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

/**
 * Validate the body of POST /work-orders.
 * @param {*} body
 * @returns {{ ok: boolean, error?: string, value?: {order_no:string, style_code:string, qty:number} }}
 */
function validateCreateWorkOrder(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'request body must be a JSON object' };
  }

  const { order_no, style_code, qty } = body;

  if (typeof order_no !== 'string' || !ORDER_NO_RE.test(order_no)) {
    return { ok: false, error: 'order_no is required and must match WO-YYYY-NNNN' };
  }

  if (typeof style_code !== 'string' || style_code.length === 0 || style_code.length > 20) {
    return { ok: false, error: 'style_code is required and must be 1–20 characters' };
  }

  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 100000) {
    return { ok: false, error: 'qty must be an integer between 1 and 100000' };
  }

  return { ok: true, value: { order_no, style_code, qty } };
}

/**
 * Validate a status value against the known enum.
 * @param {*} status
 * @returns {{ ok: boolean, error?: string }}
 */
function validateStatusValue(status) {
  if (typeof status !== 'string' || !STATUSES.includes(status)) {
    return { ok: false, error: `status must be one of ${STATUSES.join(', ')}` };
  }
  return { ok: true };
}

/**
 * Check whether a status transition is permitted by the state machine.
 * @param {string} from current status
 * @param {string} to requested status
 * @returns {boolean}
 */
function isValidTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

module.exports = {
  ORDER_NO_RE,
  STATUSES,
  TRANSITIONS,
  validateCreateWorkOrder,
  validateStatusValue,
  isValidTransition,
};
