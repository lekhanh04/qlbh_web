const db = require('../db/pool');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

exports.getAllOrders = (req, res) => {
    db.query('SELECT * FROM orders', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
};

exports.getOrderById = (req, res) => {
    db.query('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results[0]);
    });
};

exports.createOrder = (req, res) => {
    const { customer_id, total_amount } = req.body;
    db.query('INSERT INTO orders (customer_id, total_amount) VALUES (?, ?)', [customer_id, total_amount], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: result.insertId, customer_id, total_amount });
    });
};

exports.deleteOrder = (req, res) => {
    db.query('DELETE FROM orders WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Order deleted' });
    });
};

// Xuất hóa đơn thành PDF
exports.exportToPDF = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Lấy thông tin đơn hàng và chi tiết
        const [orderRows] = await db.promise().query(`
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
        const [itemRows] = await db.promise().query(`
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