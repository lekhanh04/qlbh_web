USE shopdb;

INSERT INTO products (name, price, stock) VALUES
('Áo thun', 120000, 100),
('Quần jeans', 450000, 50),
('Giày sneaker', 900000, 30);

INSERT INTO customers (name, email, phone) VALUES
('Nguyễn Văn A', 'a@example.com', '0900000001'),
('Trần Thị B', 'b@example.com', '0900000002');

-- Tạo admin mặc định (password: admin123)
INSERT INTO admins (username, password, full_name) VALUES
('admin', '$2b$10$Sdq0J8/Jxcvy3poFJ9w5NeAbjKYSuEY3jf1QiSM2WtsxyA2B/Q2QS', 'Administrator');

