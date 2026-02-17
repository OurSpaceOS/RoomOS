-- Migration to add user income and budget
CREATE TABLE IF NOT EXISTS `user_income` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `source` varchar(50) NOT NULL COMMENT 'home, job, friends, internship, borrow, etc',
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_income_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add monthly_budget to users table for quick access
ALTER TABLE `users` ADD COLUMN `monthly_budget` decimal(10,2) DEFAULT 0.00;
