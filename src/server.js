const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
require('dotenv').config();

const productsRouter = require('./routes/products');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const statsRouter = require('./routes/stats');
const authRouter = require('./routes/auth');
const pool = require('./db/pool');

const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('src/public'));

// Cấu hình session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Đặt true nếu sử dụng HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 giờ
  }
}));

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stats', statsRouter);

// Health check DB
app.get('/health/db', async (req, res) => {
  try {
    const [r1] = await pool.query('SELECT 1 AS ok');
    const [r2] = await pool.query('SELECT COUNT(*) AS products FROM products');
    res.json({ ok: r1[0].ok === 1, products: r2[0].products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: xem biến môi trường DB (đừng bật ở production)
app.get('/health/env', (req, res) => {
  res.json({
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// reload
