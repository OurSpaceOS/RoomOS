-- Add updated_at columns and triggers for better sync support

-- 1. Transactions
-- Check if column exists is hard in pure SQL without stored procedure, 
-- but we can just run this and ignore "duplicate column" errors or check manually.
-- For safety, we'll just try to add it. If it exists, this might fail, but that's okay.
ALTER TABLE `transactions` ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. Users (already has created_at, might miss updated_at)
ALTER TABLE `users` ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 3. Groups
ALTER TABLE `groups` ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 4. User Income
ALTER TABLE `user_income` ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Triggers to ensure updated_at changes even if the app doesn't explicitly set it
-- (MariaDB/MySQL ON UPDATE CURRENT_TIMESTAMP usually handles this, but explicit triggers are safer for some drivers)

DROP TRIGGER IF EXISTS `transactions_updated_at`;
CREATE TRIGGER `transactions_updated_at` BEFORE UPDATE ON `transactions` 
FOR EACH ROW SET NEW.updated_at = NOW();

DROP TRIGGER IF EXISTS `users_updated_at`;
CREATE TRIGGER `users_updated_at` BEFORE UPDATE ON `users` 
FOR EACH ROW SET NEW.updated_at = NOW();

DROP TRIGGER IF EXISTS `groups_updated_at`;
CREATE TRIGGER `groups_updated_at` BEFORE UPDATE ON `groups` 
FOR EACH ROW SET NEW.updated_at = NOW();

DROP TRIGGER IF EXISTS `user_income_updated_at`;
CREATE TRIGGER `user_income_updated_at` BEFORE UPDATE ON `user_income` 
FOR EACH ROW SET NEW.updated_at = NOW();
