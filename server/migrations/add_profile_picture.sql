-- Migration: Add profile_picture column to users table
-- This stores the FILENAME of the profile picture (not the image data)
-- Images are stored in: server/uploads/profile_[userId].jpg

ALTER TABLE `users` ADD COLUMN `profile_picture` VARCHAR(255) DEFAULT NULL AFTER `role`;
