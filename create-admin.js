const bcrypt = require('bcryptjs');
const pool = require('./src/db/pool');

async function createAdmin() {
  try {
    const username = process.argv[2];
    const password = process.argv[3];
    const fullName = process.argv[4] || 'Administrator';
    
    if (!username || !password) {
      console.log('Cách sử dụng: node create-admin.js <username> <password> [full_name]');
      console.log('Ví dụ: node create-admin.js admin admin123 "Admin User"');
      process.exit(1);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Kiểm tra xem admin đã tồn tại chưa
    const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', [username]);
    
    if (existing.length > 0) {
      console.log(`Admin với username "${username}" đã tồn tại!`);
      process.exit(1);
    }
    
    // Tạo admin mới
    await pool.query(
      'INSERT INTO admins (username, password, full_name) VALUES (?, ?, ?)',
      [username, hashedPassword, fullName]
    );
    
    console.log(`✅ Đã tạo admin thành công!`);
    console.log(`Username: ${username}`);
    console.log(`Full name: ${fullName}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Lỗi khi tạo admin:', error.message);
  } finally {
    process.exit(0);
  }
}

createAdmin();








