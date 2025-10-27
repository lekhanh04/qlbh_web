Dự Án Quản Lý Bán Hàng


1. Yêu cầu hệ thống
Node.js: Phiên bản tương thích với Express 5.1.0 (khuyến nghị Node.js 16+).
MySQL: Máy chủ MySQL chạy (có thể dùng XAMPP, MySQL Workbench, hoặc Docker).
2. Biến môi trường (.env)
Tạo file .env trong thư mục gốc với các biến sau (giá trị mặc định từ mã nguồn):

DB_HOST=127.0.0.1.
DB_PORT=3306.
DB_USER=root.
DB_PASSWORD=  # Để trống nếu không có mật khẩu.
DB_NAME=shopdb.
SESSION_SECRET=your-secret-key-change-in-production.
PORT=3000  # Cho development; production dùng 10000 (từ render.yaml).
NODE_ENV=development  # Hoặc production.
Lưu ý: File .env không được commit vào Git để bảo mật.

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

d:/pj.csdl/
├── .env                    # Biến môi trường (không commit).
├── create-admin.js         # Script tạo admin.
├── package.json            # Dependencies và scripts.
├── package-lock.json       # Lock file cho npm.
├── Procfile                # Cho Heroku-like deployment.
├── render.yaml             # Cho Render deployment.
├── sample-products.xlsx    # File mẫu sản phẩm.
├── scripts/                # Scripts test.
│   ├── testCreateOrder.js.
│   └── testCreateOrderWithItems.js.
├── sql/                    # SQL files.
│   ├── schema.sql          # Tạo database và tables.
│   └── seed.sql            # Dữ liệu mẫu.
├── src/                    # Source code.
│   ├── server.js           # Entry point Express server.
│   ├── controllers/        # Business logic.
│   │   ├── authController.js.
│   │   ├── customerController.js.
│   │   ├── customersController.js.
│   │   ├── orderController.js.
│   │   ├── ordersController.js.
│   │   ├── productsController.js.
│   │   └── statsController.js.
│   ├── db/                 # Database connection.
│   │   └── pool.js         # MySQL pool config.
│   ├── public/             # Static frontend files.
│   │   ├── app.js.
│   │   ├── customers.html.
│   │   ├── index.html.
│   │   ├── login.html.
│   │   ├── orders.html.
│   │   ├── products.html.
│   │   ├── stats.html.
│   │   └── styles.css.
│   └── routes/             # API routes.
│       ├── auth.js.
│       ├── customerRoutes.js.
│       ├── customers.js.
│       ├── orderRoutes.js.
│       ├── orders.js.
│       ├── products.js.
│       └── stats.js.
├── uploads/                # Thư mục upload files.
└── node_modules/           # Dependencies (tạo sau npm install).
