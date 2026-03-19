-- Admin users table for volleyball app administration
CREATE TABLE `volley_admin_users` (
    `id`            INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `username`      TEXT NOT NULL UNIQUE,
    `password_hash` TEXT NOT NULL,
    `email`         TEXT,
    `role`          TEXT NOT NULL DEFAULT 'admin',
    `last_login`    TEXT,
    `created_at`    TEXT NOT NULL DEFAULT (datetime('now')),
    `updated_at`    TEXT NOT NULL DEFAULT (datetime('now'))
);
