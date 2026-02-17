-- Add DM support to chat_messages
-- recipient_id = NULL means group message, otherwise it's a DM to that user

ALTER TABLE `chat_messages`
ADD COLUMN `recipient_id` int(11) DEFAULT NULL AFTER `user_id`,
ADD CONSTRAINT `fk_chat_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- Index for faster DM lookups
ALTER TABLE `chat_messages`
ADD INDEX `idx_chat_dm` (`user_id`, `recipient_id`),
ADD INDEX `idx_chat_recipient` (`recipient_id`);
