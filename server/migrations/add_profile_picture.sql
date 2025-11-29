-- Profile Picture Feature Migration
-- Add profile_picture column to users table

ALTER TABLE users ADD COLUMN profile_picture TEXT DEFAULT NULL;

-- Column will store base64 encoded image data
-- Format: data:image/jpeg;base64,<encoded_data>
-- NULL means user has no profile picture (will show colored initials)
