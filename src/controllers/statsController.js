const pool = require('../db/pool');

// GET /api/stats/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&group=day|month&customer_id=&product_id=
exports.revenue = async (req, res) => {
  try {
    const { from, to, group } = req.query;
    const grp = group === 'month' ? 'month' : 'day';
    const params = [];
    let where = '1=1';
    if (from) { where += ' AND o.created_at >= ?'; params.push(from); }
    if (to) { where += ' AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)'; params.push(to); }

    const customerId = req.query.customer_id ? Number(req.query.customer_id) : undefined;
    const productId = req.query.product_id ? Number(req.query.product_id) : undefined;
    if (Number.isFinite(customerId)) { where += ' AND o.customer_id = ?'; params.push(customerId); }

    const fmt = grp === 'month' ? "%Y-%m" : "%Y-%m-%d";
    let sql;
    if (Number.isFinite(productId)) {
      // Khi lọc theo sản phẩm, tính doanh thu từ order_items
      sql = `SELECT DATE_FORMAT(o.created_at, '${fmt}') AS period,
                    SUM(oi.quantity * oi.price) AS revenue
             FROM orders o
             JOIN order_items oi ON oi.order_id = o.id AND oi.product_id = ?
             WHERE ${where}
             GROUP BY period
             ORDER BY period ASC`;
      params.unshift(productId);
    } else {
      sql = `SELECT DATE_FORMAT(o.created_at, '${fmt}') AS period,
                    SUM(o.total) AS revenue
             FROM orders o
             WHERE ${where}
             GROUP BY period
             ORDER BY period ASC`;
    }
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/stats/top-products?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=5&customer_id=&product_id=
exports.topProducts = async (req, res) => {
  try {
    const { from, to } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '5', 10), 1), 50);
    const params = [];
    let where = '1=1';
    if (from) { where += ' AND o.created_at >= ?'; params.push(from); }
    if (to) { where += ' AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)'; params.push(to); }

    const customerId = req.query.customer_id ? Number(req.query.customer_id) : undefined;
    const productId = req.query.product_id ? Number(req.query.product_id) : undefined;
    if (Number.isFinite(customerId)) { where += ' AND o.customer_id = ?'; params.push(customerId); }
    if (Number.isFinite(productId)) { where += ' AND p.id = ?'; params.push(productId); }

    const [rows] = await pool.query(
      `SELECT p.id, p.name, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.price) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE ${where}
       GROUP BY p.id, p.name
       ORDER BY qty DESC, revenue DESC
       LIMIT ?`,
      [...params, limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


