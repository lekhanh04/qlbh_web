const pool = require('../db/pool');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để xử lý upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép file Excel (.xlsx, .xls)'));
    }
  }
});

exports.list = async (req, res) => {
  try {
    const { q } = req.query;
    if (q && typeof q === 'string') {
      const like = `%${q}%`;
      const [rows] = await pool.query(
        'SELECT * FROM products WHERE name LIKE ? ORDER BY id DESC',
        [like]
      );
      return res.json(rows);
    }
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    if (!name || price == null || stock == null) return res.status(400).json({ message: 'Thiếu dữ liệu' });
    const [result] = await pool.query('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', [name, price, stock]);
    res.status(201).json({ id: result.insertId, name, price, stock });
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    const [result] = await pool.query('UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?', [name, price, stock, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ id: Number(req.params.id), name, price, stock });
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err.message });
  }
};

// Tăng số lượng tồn kho
exports.addStock = async (req, res) => {
  try {
    const { amount } = req.body;
    const add = Number(amount);
    if (!Number.isFinite(add) || add <= 0) {
      return res.status(400).json({ message: 'amount phải là số > 0' });
    }
    const [result] = await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [add, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy' });
    const [rows] = await pool.query('SELECT id, name, price, stock FROM products WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'DB error', error: err.message });
  }
};

// Import sản phẩm từ file Excel
exports.importFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file Excel' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'File Excel không có dữ liệu' });
    }

    // Debug: Log dữ liệu đọc được (chỉ trong development)
    console.log('Dữ liệu Excel đọc được:', JSON.stringify(data.slice(0, 3), null, 2));

    const products = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row['Tên sản phẩm'] || row['name'] || row['Tên'] || '';
      const price = parseFloat(row['Giá (VNĐ)'] || row['Giá'] || row['price'] || row['Giá bán'] || 0);
      const stock = parseInt(row['Tồn kho'] || row['stock'] || row['Tồn'] || 0);

      if (!name || isNaN(price) || isNaN(stock)) {
        errors.push(`Dòng ${i + 2}: Dữ liệu không hợp lệ`);
        continue;
      }

      if (price < 0 || stock < 0) {
        errors.push(`Dòng ${i + 2}: Giá và tồn kho phải >= 0`);
        continue;
      }

      products.push({ name, price, stock });
    }

    if (products.length === 0) {
      return res.status(400).json({ 
        message: 'Không có sản phẩm hợp lệ để import', 
        errors 
      });
    }

    // Thêm sản phẩm vào database
    const insertedProducts = [];
    for (const product of products) {
      try {
        const [result] = await pool.query(
          'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
          [product.name, product.price, product.stock]
        );
        insertedProducts.push({
          id: result.insertId,
          ...product
        });
      } catch (err) {
        errors.push(`Lỗi khi thêm sản phẩm "${product.name}": ${err.message}`);
      }
    }

    // Xóa file tạm
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    res.json({
      message: `Import thành công ${insertedProducts.length} sản phẩm`,
      insertedProducts,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xử lý file Excel', error: err.message });
  }
};

// Export multer middleware để sử dụng trong routes
exports.upload = upload.single('excelFile');

