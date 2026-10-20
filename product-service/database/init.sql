CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    price DECIMAL(12, 2) NOT NULL,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    image MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX products_name_index ON products (name);

INSERT INTO products (name, description, price, stock, image) VALUES
('Tas Laptop Kuliah', 'Tas laptop dengan kompartemen khusus untuk perlengkapan mahasiswa', 185000.00, 30, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADU1EQVR42mNkYPhfDwAChWGA60e6kgAAAABJRU5ErkJggg=='),
('Tas Laptop Kuliah Premium', 'Tas laptop tahan air dengan ruang tambahan untuk buku dan charger', 235000.00, 18, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADU1EQVR42mNkYPhfDwAChWGA60e6kgAAAABJRU5ErkJggg==');