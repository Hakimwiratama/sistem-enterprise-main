DELIMITER $$

CREATE PROCEDURE migrate_product_category_and_owner()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'category'
    ) THEN
        ALTER TABLE products
            ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Umum';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE products
            ADD COLUMN seller_id VARCHAR(191) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND index_name = 'products_seller_id_index'
    ) THEN
        CREATE INDEX products_seller_id_index ON products (seller_id);
    END IF;
END$$

CALL migrate_product_category_and_owner()$$
DROP PROCEDURE migrate_product_category_and_owner$$

DELIMITER ;
