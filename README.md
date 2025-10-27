Dự Án Quản Lý Bán Hàng


1. Yêu cầu hệ thống
Node.js: Phiên bản tương thích với Express 5.1.0 (khuyến nghị Node.js 16+).
MySQL: Máy chủ MySQL chạy (có thể dùng XAMPP, MySQL Workbench, hoặc Docker).
2. Biến môi trường (.env)
Tạo file .env trong thư mục gốc với các biến sau (giá trị mặc định từ mã nguồn):

3. Cơ sở dữ liệu
Tạo database: Chạy file sql/schema.sql để tạo database shopdb và các bảng (products, customers, orders, order_items, admins).
Seed data: Chạy file sql/seed.sql để chèn dữ liệu mẫu (sản phẩm, khách hàng, admin mặc định với username: admin, password: admin123).
Tạo admin bổ sung: Dùng script create-admin.js (ví dụ: node create-admin.js newadmin newpass "Full Name").


4. Cài đặt dependencies
Chạy lệnh:
npm install.

5. Chạy dự án
Development: npm run dev (dùng nodemon để tự động restart).
Production: npm start.
Server sẽ chạy trên http://localhost:3000 (hoặc PORT từ .env).

6. Triển khai (Deployment).
Render: Sử dụng render.yaml để deploy lên Render với plan free, build command npm install, start command npm start, PORT=10000.
Heroku-like: Sử dụng Procfile với web: npm start.

7. Kiểm tra sức khỏe.
/health/db: Kiểm tra kết nối DB và số sản phẩm.
/health/env: Xem biến môi trường DB (chỉ dùng debug, không bật ở production).

8. Cấu trúc dự án.
Backend: Express.js với routes cho auth, products, customers, orders, stats.
Frontend: Static files trong src/public/ (HTML, CSS, JS).
Database: MySQL với pool connection.
Authentication: Session-based với bcrypt cho mật khẩu.
Uploads: Thư mục uploads/ cho file upload (sử dụng multer).


Cấu trúc dự án

<pre>
d:/pj.csdl/
├── .env
├── package.json
└── src/
    ├── server.js
    └── controllers/
        └── authController.js
</pre>
