export function validateProduct(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Body must be an object';
  const keys = ['pid', 'pname', 'price', 'quantity'];
  if (Object.keys(body).some(k => !keys.includes(k))) return 'Unknown field';
  if (!partial && keys.some(k => body[k] === undefined)) return 'pid, pname, price, quantity required';
  if (partial && !Object.keys(body).length) return 'Empty update';
  if (body.pid !== undefined && (!Number.isSafeInteger(body.pid) || body.pid <= 0)) return 'Invalid pid';
  if (body.pname !== undefined && (typeof body.pname !== 'string' || !body.pname.trim() || body.pname.length > 100)) return 'Invalid pname';
  if (body.price !== undefined && (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)) return 'Invalid price';
  if (body.quantity !== undefined && (!Number.isSafeInteger(body.quantity) || body.quantity < 0)) return 'Invalid quantity';
  return null;
}
