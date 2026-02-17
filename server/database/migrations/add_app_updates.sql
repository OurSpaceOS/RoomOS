-- App Updates table
-- Stores version history and update info

DROP TABLE IF EXISTS `app_updates`;

CREATE TABLE `app_updates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version` VARCHAR(20) NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT 'New Update Available',
  `description` TEXT DEFAULT NULL,
  `release_notes` JSON DEFAULT NULL,
  `download_url` VARCHAR(512) NOT NULL,
  `release_date` DATE NOT NULL,
  `force_update` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert initial version
INSERT INTO `app_updates` (`version`, `title`, `description`, `release_notes`, `download_url`, `release_date`, `force_update`, `is_active`)
VALUES (
  '1.1.0',
  'RoomOS v1.1.0',
  'New features and improvements for your shared living experience.',
  '["Pull-to-refresh on Dashboard", "Global refresh cooldown system", "Schedule defaults to current day", "App update notification system", "Performance improvements and bug fixes"]',
  'https://github.com/Sumit7739/roomOS/releases/latest',
  '2026-02-18',
  0,
  1
);
