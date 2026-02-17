-- Add tracking column for auto-debit processing
-- Run this if you already have the auto_debits table
ALTER TABLE `auto_debits` ADD COLUMN IF NOT EXISTS `last_deducted_at` DATE DEFAULT NULL AFTER `is_active`;