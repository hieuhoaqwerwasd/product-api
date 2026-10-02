import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { validateProduct } from './validation.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.on('finish', () => console.log(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode })));
  next();
});
const Product = mongoose.model('Product', new mongoose.Schema({
  pid: { type: Number, required: true, unique: true },
  pname: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 }
}, { versionKey: false, toJSON: { transform: (_, obj) => { delete obj._id; return obj; } } }));
app.get(['/health', '/api/health'], async (_req, res) => {
  try { await mongoose.connection.db.admin().ping(); res.json({ status: 'UP', database: 'UP' }); }
  catch { res.status(503).json({ status: 'DOWN' }); }
});
app.param('pid', (req, res, next, pid) => {
  if (!/^\d+$/.test(pid) || !Number.isSafeInteger(Number(pid)) || Number(pid) < 1) return res.status(400).json({ error: 'Invalid pid' });
  next();
});
app.get('/api/products', async (_req, res) => res.json({ items: await Product.find().sort({ pid: 1 }) }));
app.get('/api/products/:pid', async (req, res) => {
  const p = await Product.findOne({ pid: req.params.pid });
  res.status(p ? 200 : 404).json(p || { error: 'Product not found' });
});
app.post('/api/products', async (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ error });
  res.status(201).json(await Product.create(req.body));
});
app.put('/api/products/:pid', async (req, res) => {
  const error = validateProduct(req.body, true);
  if (error || req.body.pid !== undefined) return res.status(400).json({ error: error || 'pid is immutable' });
  const p = await Product.findOneAndUpdate({ pid: req.params.pid }, { $set: req.body }, { new: true, runValidators: true });
  res.status(p ? 200 : 404).json(p || { error: 'Product not found' });
});
app.delete('/api/products/:pid', async (req, res) => {
  const p = await Product.findOneAndDelete({ pid: req.params.pid });
  res.status(p ? 200 : 404).json(p ? { message: 'Product deleted', pid: p.pid } : { error: 'Product not found' });
});
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  const status = err.code === 11000 ? 409 : err.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error(err.message);
  res.status(status).json({ error: status === 409 ? 'Duplicate pid' : status === 400 ? 'Invalid JSON' : 'Internal error' });
});
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
await Product.init();
const server = app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Product API ready'));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(async () => { await mongoose.disconnect(); process.exit(0); }));
