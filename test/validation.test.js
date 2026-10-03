import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProduct } from '../src/validation.js';
test('accepts valid product', () => assert.equal(validateProduct({ pid: 1, pname: 'X', price: 10, quantity: 20 }), null));
test('rejects negative/fractional inventory and string price', () => {
  for (const body of [{ quantity: -1 }, { quantity: 1.5 }, { price: '10' }, { price: Infinity }, { $set: {} }, {}]) assert.ok(validateProduct(body, true));
});

test('rejects blank product name', () => {
  assert.equal(
    validateProduct({ pname: '   ' }, true),
    'Invalid pname'
  );
});