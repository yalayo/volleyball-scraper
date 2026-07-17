-- Append-only EAV storage (components/storage), tables prefixed "volley"
-- via the TABLE_PREFIX setting. See components/storage/README.md.

CREATE TABLE IF NOT EXISTS `volley_transactions` (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_time  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    tx_meta  TEXT
);

CREATE TABLE IF NOT EXISTS `volley_entities` (
    entity_id    TEXT PRIMARY KEY,
    entity_type  TEXT NOT NULL,
    created_tx   INTEGER NOT NULL,
    retracted_tx INTEGER
);

CREATE TABLE IF NOT EXISTS `volley_facts` (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id   TEXT    NOT NULL,
    attribute   TEXT    NOT NULL,
    value       TEXT    NOT NULL,
    tx_id       INTEGER NOT NULL,
    added       INTEGER NOT NULL DEFAULT 1,   -- 1 = assert, 0 = retract
    excised_at  TEXT                          -- ISO timestamp when GDPR-excised
);

CREATE TABLE IF NOT EXISTS `volley_db_schema` (
    ident        TEXT PRIMARY KEY,
    value_type   TEXT NOT NULL DEFAULT 'string',
    cardinality  TEXT NOT NULL DEFAULT 'one',
    doc          TEXT NOT NULL DEFAULT '',
    unique_val   INTEGER NOT NULL DEFAULT 0,
    is_component INTEGER NOT NULL DEFAULT 0,
    created_tx   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS `volley_facts_entity` ON `volley_facts` (entity_id, attribute, tx_id);
CREATE INDEX IF NOT EXISTS `volley_facts_avet`   ON `volley_facts` (attribute, value);
CREATE INDEX IF NOT EXISTS `volley_entities_type` ON `volley_entities` (entity_type);

-- current_facts: latest non-excised, non-retracted fact per entity+attribute
CREATE VIEW IF NOT EXISTS `volley_current_facts` AS
SELECT entity_id, attribute, value
FROM (
  SELECT entity_id, attribute, value, added,
         ROW_NUMBER() OVER (PARTITION BY entity_id, attribute ORDER BY tx_id DESC) AS rn
  FROM volley_facts
  WHERE excised_at IS NULL
) ranked
WHERE rn = 1 AND added = 1;

-- fact_history: full audit log with transaction metadata
CREATE VIEW IF NOT EXISTS `volley_fact_history` AS
SELECT f.entity_id, f.attribute, f.value, f.added,
       f.tx_id, t.tx_time, t.tx_meta
FROM volley_facts f
JOIN volley_transactions t ON t.id = f.tx_id
WHERE f.excised_at IS NULL;
