import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://localhost:3000';
const pid = Math.floor(Date.now() / 1000);
async function request(path, method = 'GET', body, expected = 200) {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json(); assert.equal(r.status, expected, JSON.stringify(data)); return data;
}
await request('/api/health');
try {
  await request('/api/products', 'POST', { pid, pname: 'Smoke X', price: 100, quantity: 10 }, 201);
  await request('/api/products', 'POST', { pid, pname: 'duplicate', price: 1, quantity: 1 }, 409);
  assert.equal((await request(`/api/products/${pid}`)).quantity, 10);
  assert.equal((await request(`/api/products/${pid}`, 'PUT', { quantity: 7 })).quantity, 7);
  await request(`/api/products/${pid}`, 'PUT', { quantity: -1 }, 400);
  await request('/api/products');
} finally { await request(`/api/products/${pid}`, 'DELETE'); }
await request(`/api/products/${pid}`, 'GET', undefined, 404);
console.log('PASS: MongoDB-backed CRUD, duplicate, validation, health');
