const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

// Đăng nhập admin
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    // Tìm admin theo username
    const [rows] = await pool.query(
      'SELECT id, username, password, full_name FROM admins WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const admin = rows[0];

    // Kiểm tra mật khẩu
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    // Tạo session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    req.session.adminFullName = admin.full_name;

    res.json({
      message: 'Đăng nhập thành công',
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
  }
};

// Đăng xuất
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Lỗi khi đăng xuất' });
    }
    res.json({ message: 'Đăng xuất thành công' });
  });
};

// Kiểm tra trạng thái đăng nhập
exports.checkAuth = (req, res) => {
  if (req.session.adminId) {
    res.json({
      authenticated: true,
      admin: {
        id: req.session.adminId,
        username: req.session.adminUsername,
        full_name: req.session.adminFullName
      }
    });
  } else {
    res.json({ authenticated: false });
  }
};

// Middleware kiểm tra đăng nhập
exports.requireAuth = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
  }
};
