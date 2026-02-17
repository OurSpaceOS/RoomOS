-- Migration: Insert default dock_config for all users who don't have one
-- Default dock: Home, Profile, Wallet, Chat, Settings
-- Run this SQL against your database

-- The default dock_config JSON value
SET @default_dock = '[{"id":"dock_show_home","visible":true},{"id":"dock_show_profile","visible":true},{"id":"dock_show_wallet","visible":true},{"id":"dock_show_chat","visible":true},{"id":"dock_show_settings","visible":true},{"id":"dock_show_roster","visible":false},{"id":"dock_show_crew","visible":false},{"id":"dock_show_attendance","visible":false},{"id":"dock_show_analytics","visible":false},{"id":"dock_show_schedule","visible":false}]';

-- Insert default dock_config for all users who DON'T already have one
INSERT INTO user_settings (user_id, setting_key, setting_value)
SELECT u.id, 'dock_config', @default_dock
FROM users u
WHERE u.id NOT IN (
    SELECT us.user_id 
    FROM user_settings us 
    WHERE us.setting_key = 'dock_config'
);

-- Optional: Verify what was inserted
-- SELECT us.user_id, u.name, us.setting_value 
-- FROM user_settings us 
-- JOIN users u ON u.id = us.user_id 
-- WHERE us.setting_key = 'dock_config';
