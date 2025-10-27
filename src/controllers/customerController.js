const db = require('../db/pool');

exports.getAllCustomers = (req, res) => {
    db.query('SELECT * FROM customers', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getCustomerById = (req, res) => {
    db.query('SELECT * FROM customers WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results[0]);
    });
};

exports.createCustomer = (req, res) => {
    const { name, email, phone } = req.body;
    db.query('INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)', [name, email, phone], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: result.insertId, name, email, phone });
    });
};

exports.updateCustomer = (req, res) => {
    const { name, email, phone } = req.body;
    db.query('UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: req.params.id, name, email, phone });
    });
};

exports.deleteCustomer = (req, res) => {
    db.query('DELETE FROM customers WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Customer deleted' });
    });
};