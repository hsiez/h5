CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | unsubscribed
  confirm_token TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  unsubscribed_at TEXT
);

CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_confirm ON subscribers(confirm_token);
CREATE INDEX idx_subscribers_unsub ON subscribers(unsubscribe_token);
