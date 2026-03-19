CREATE TABLE `volley_leagues` (
    `id`          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `name`        TEXT NOT NULL,
    `category`    TEXT NOT NULL,
    `url`         TEXT NOT NULL,
    `series_id`   TEXT,
    `sams_id`     TEXT,
    `teams_count` INTEGER DEFAULT 0,
    `is_active`   INTEGER DEFAULT 1,
    `created_at`  TEXT NOT NULL DEFAULT (datetime('now')),
    `updated_at`  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE `volley_teams` (
    `id`              INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `name`            TEXT NOT NULL,
    `location`        TEXT,
    `team_id`         TEXT NOT NULL,
    `sams_id`         TEXT,
    `homepage`        TEXT,
    `logo_url`        TEXT,
    `contact_email`   TEXT,
    `contact_address` TEXT,
    `league_id`       INTEGER,
    `is_active`       INTEGER DEFAULT 1,
    `created_at`      TEXT NOT NULL DEFAULT (datetime('now')),
    `updated_at`      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (`league_id`) REFERENCES `volley_leagues` (`id`)
);

CREATE TABLE `volley_players` (
    `id`            INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `name`          TEXT NOT NULL,
    `position`      TEXT,
    `nationality`   TEXT,
    `jersey_number` TEXT,
    `player_id`     TEXT,
    `team_id`       INTEGER,
    `is_active`     INTEGER DEFAULT 1,
    `created_at`    TEXT NOT NULL DEFAULT (datetime('now')),
    `updated_at`    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (`team_id`) REFERENCES `volley_teams` (`id`)
);

CREATE TABLE `volley_matches` (
    `id`                  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `match_id`            TEXT,
    `home_team_id`        INTEGER,
    `away_team_id`        INTEGER,
    `home_team_name`      TEXT NOT NULL,
    `away_team_name`      TEXT NOT NULL,
    `home_score`          INTEGER,
    `away_score`          INTEGER,
    `home_sets`           INTEGER,
    `away_sets`           INTEGER,
    `set_results`         TEXT,
    `match_date`          TEXT,
    `status`              TEXT DEFAULT 'completed',
    `league_id`           INTEGER,
    `series_id`           TEXT,
    `scoresheet_pdf_url`  TEXT,
    `location`            TEXT,
    `sams_url`            TEXT,
    `created_at`          TEXT NOT NULL DEFAULT (datetime('now')),
    `updated_at`          TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (`home_team_id`) REFERENCES `volley_teams` (`id`),
    FOREIGN KEY (`away_team_id`) REFERENCES `volley_teams` (`id`),
    FOREIGN KEY (`league_id`)    REFERENCES `volley_leagues` (`id`)
);

CREATE TABLE `volley_scrape_logs` (
    `id`                INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    `operation`         TEXT NOT NULL,
    `status`            TEXT NOT NULL,
    `message`           TEXT NOT NULL,
    `details`           TEXT,
    `duration`          INTEGER,
    `records_processed` INTEGER DEFAULT 0,
    `records_created`   INTEGER DEFAULT 0,
    `records_updated`   INTEGER DEFAULT 0,
    `created_at`        TEXT NOT NULL DEFAULT (datetime('now'))
);
