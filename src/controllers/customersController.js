const pool = require('../db/pool');

exports.list = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.detail = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const [result] = await pool.query('INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)', [name, email, phone]);
    res.status(201).json({ id: result.insertId, name, email, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    await pool.query('UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone, req.params.id]);
    res.json({ id: Number(req.params.id), name, email, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

