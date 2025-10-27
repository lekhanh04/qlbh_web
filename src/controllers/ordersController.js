const pool = require('../db/pool');
const puppeteer = require('puppeteer');

exports.list = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('orders.list error:', err.stack || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.detail = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const order = rows[0];
    const [items] = await pool.query(
      `SELECT oi.product_id, p.name, oi.quantity, oi.price
       FROM order_items oi JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [req.params.id]
    );
    res.json({ ...order, items });
  } catch (err) {
    console.error('orders.detail error:', err.stack || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  let conn;
  try {
    const { customer_id } = req.body;
    let { total, items } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id là bắt buộc' });
    }
    if (typeof customer_id !== 'number' || isNaN(customer_id)) {
      return res.status(400).json({ error: 'customer_id phải là number' });
    }
    // items là mảng { product_id, quantity }
    if (items && !Array.isArray(items)) {
      return res.status(400).json({ error: 'items phải là mảng' });
    }

    conn = await pool.getConnection();

    // kiểm tra bảng customers tồn tại và customer tồn tại
    try {
      const [checkTable] = await conn.query("SHOW TABLES LIKE 'customers'");
      if (!checkTable.length) {
        return res.status(500).json({ error: "Bảng 'customers' không tồn tại trong database" });
      }
    } catch (e) {
      console.error('Error checking customers table:', e.stack || e);
      return res.status(500).json({ error: 'Lỗi kiểm tra database' });
    }

    const [cust] = await conn.query('SELECT id FROM customers WHERE id = ?', [customer_id]);
    if (!cust.length) {
      return res.status(400).json({ error: `Customer id=${customer_id} không tồn tại` });
    }

    await conn.beginTransaction();

    // Nếu có items, tính total theo DB và chèn order_items
    if (Array.isArray(items) && items.length > 0) {
      // chuẩn hóa items
      const normalized = items
        .filter(it => it && typeof it.product_id === 'number' && typeof it.quantity === 'number' && it.quantity > 0);
      if (normalized.length === 0) {
        return res.status(400).json({ error: 'items không hợp lệ' });
      }

      // Lấy giá và tồn kho sản phẩm
      const productIds = [...new Set(normalized.map(it => it.product_id))];
      const [products] = await conn.query(
        `SELECT id, price, stock FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
        productIds
      );
      const idToPrice = new Map(products.map(p => [p.id, Number(p.price)]));
      const idToStock = new Map(products.map(p => [p.id, Number(p.stock)]));
      let computedTotal = 0;
      // BƯỚC 1: kiểm tra đủ tồn
      for (const it of normalized) {
        const price = idToPrice.get(it.product_id);
        const stock = idToStock.get(it.product_id);
        if (typeof price !== 'number') {
          await conn.rollback();
          return res.status(400).json({ error: `Sản phẩm id=${it.product_id} không tồn tại` });
        }
        if (stock == null || stock < it.quantity) {
          await conn.rollback();
          return res.status(400).json({ error: `Không đủ hàng cho sản phẩm id=${it.product_id}` });
        }
        computedTotal += price * it.quantity;
      }

      // BƯỚC 2: tạo đơn hàng và order_items như trước
      const [result] = await conn.query(
        'INSERT INTO orders (customer_id, total) VALUES (?, ?)',
        [customer_id, computedTotal]
      );
      const orderId = result.insertId;
      const values = normalized.flatMap(it => [orderId, it.product_id, it.quantity, idToPrice.get(it.product_id)]);
      const placeholders = normalized.map(() => '(?, ?, ?, ?)').join(',');
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ${placeholders}`,
        values
      );
      // BƯỚC 3: cập nhật stock
      for (const it of normalized) {
        await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [it.quantity, it.product_id]);
      }
      await conn.commit();
      return res.status(201).json({ id: orderId, customer_id, total: computedTotal, items: normalized });
    }

    // Không có items: yêu cầu total là số và tạo đơn đơn giản
    if (typeof total !== 'number' || isNaN(total)) {
      return res.status(400).json({ error: 'total phải là number khi không truyền items' });
    }
    const [result] = await conn.query(
      'INSERT INTO orders (customer_id, total) VALUES (?, ?)',
      [customer_id, total]
    );
    await conn.commit();

    res.status(201).json({ id: result.insertId, customer_id, total });
  } catch (err) {
    try { if (conn) await conn.rollback(); } catch (_) {}
    console.error('orders.create error:', err.stack || err);
    // trả message ngắn gọn cho FE, log chi tiết ở server
    res.status(500).json({ error: 'Lỗi server khi tạo đơn' });
  } finally {
    if (conn) conn.release();
  }
};

exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('orders.remove error:', err.stack || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Xuất hóa đơn thành PDF
exports.exportToPDF = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Lấy thông tin đơn hàng và chi tiết
    const [orderRows] = await pool.query(`
        SELECT o.*, c.name as customer_name, c.email, c.phone 
        FROM orders o 
        JOIN customers c ON o.customer_id = c.id 
        WHERE o.id = ?
    `, [orderId]);
    
    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    
    const order = orderRows[0];
    
    // Lấy chi tiết sản phẩm trong đơn hàng
    const [itemRows] = await pool.query(`
        SELECT oi.*, p.name as product_name 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
    `, [orderId]);
    
    // Tạo HTML cho hóa đơn
    const html = generateInvoiceHTML(order, itemRows);
    
    // Tạo PDF bằng Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
    
    // Gửi file PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="hoa-don-${orderId}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Lỗi khi xuất PDF:', error);
    res.status(500).json({ message: 'Lỗi khi xuất PDF', error: error.message });
  }
};

// Hàm tạo HTML cho hóa đơn
function generateInvoiceHTML(order, items) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };
  
  let itemsHTML = '';
  let totalAmount = 0;
  
  items.forEach(item => {
    const subtotal = item.price * item.quantity;
    totalAmount += subtotal;
    itemsHTML += `
        <tr>
            <td>${item.product_name}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${formatCurrency(item.price)}</td>
            <td style="text-align: right;">${formatCurrency(subtotal)}</td>
        </tr>
    `;
  });
  
  return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Hóa đơn #${order.id}</title>
          <style>
              body {
                  font-family: 'Times New Roman', serif;
                  font-size: 12px;
                  line-height: 1.4;
                  margin: 0;
                  padding: 20px;
                  color: #333;
              }
              .header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 2px solid #333;
                  padding-bottom: 20px;
              }
              .company-name {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 10px;
              }
              .invoice-title {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 20px;
              }
              .invoice-info {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 30px;
              }
              .customer-info, .invoice-details {
                  width: 45%;
              }
              .info-section h3 {
                  margin: 0 0 10px 0;
                  font-size: 14px;
                  font-weight: bold;
                  border-bottom: 1px solid #333;
                  padding-bottom: 5px;
              }
              .info-section p {
                  margin: 5px 0;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
              }
              th, td {
                  border: 1px solid #333;
                  padding: 8px;
                  text-align: left;
              }
              th {
                  background-color: #f5f5f5;
                  font-weight: bold;
              }
              .total-section {
                  text-align: right;
                  margin-top: 20px;
              }
              .total-amount {
                  font-size: 16px;
                  font-weight: bold;
                  border-top: 2px solid #333;
                  padding-top: 10px;
              }
              .footer {
                  margin-top: 40px;
                  text-align: center;
                  font-style: italic;
              }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="company-name">CỬA HÀNG PTIT</div>
              <div>Địa chỉ: Hà Đông, Hà Nội</div>
          </div>
          
          <div class="invoice-title">HÓA ĐƠN BÁN HÀNG</div>
          
          <div class="invoice-info">
              <div class="customer-info">
                  <div class="info-section">
                      <h3>THÔNG TIN KHÁCH HÀNG</h3>
                      <p><strong>Tên:</strong> ${order.customer_name}</p>
                      <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
                      <p><strong>Điện thoại:</strong> ${order.phone || 'N/A'}</p>
                  </div>
              </div>
              
              <div class="invoice-details">
                  <div class="info-section">
                      <h3>THÔNG TIN HÓA ĐƠN</h3>
                      <p><strong>Số hóa đơn:</strong> #${order.id}</p>
                      <p><strong>Ngày tạo:</strong> ${formatDate(order.created_at)}</p>
                      <p><strong>Mã khách hàng:</strong> ${order.customer_id}</p>
                  </div>
              </div>
          </div>
          
          <table>
              <thead>
                  <tr>
                      <th style="width: 50%;">Tên sản phẩm</th>
                      <th style="width: 15%;">Số lượng</th>
                      <th style="width: 20%;">Đơn giá</th>
                      <th style="width: 15%;">Thành tiền</th>
                  </tr>
              </thead>
              <tbody>
                  ${itemsHTML}
              </tbody>
          </table>
          
          <div class="total-section">
              <div class="total-amount">
                  <strong>TỔNG CỘNG: ${formatCurrency(totalAmount)}</strong>
              </div>
          </div>
          
          <div class="footer">
              <p>Cảm ơn quý khách đã mua hàng!</p>
              <p>Hóa đơn được tạo tự động bởi hệ thống quản lý bán hàng</p>
          </div>
      </body>
      </html>
  `;
}

