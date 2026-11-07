-- AutoAds analytics (ClickHouse) — Proof of Play aggregates for advertiser dashboards.
CREATE DATABASE IF NOT EXISTS autoads;

CREATE TABLE IF NOT EXISTS autoads.playback_events
(
  event_id String,
  company_id String,
  campaign_id String,
  screen_id String,
  locality LowCardinality(String),
  city LowCardinality(String) DEFAULT 'Bengaluru',
  event_type LowCardinality(String),
  played_at DateTime64(3, 'Asia/Kolkata'),
  duration_seconds UInt16 DEFAULT 0
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(played_at)
ORDER BY (company_id, campaign_id, played_at, event_id);

CREATE TABLE IF NOT EXISTS autoads.playback_daily
(
  day Date,
  company_id String,
  campaign_id String,
  locality LowCardinality(String),
  completed_plays UInt64,
  failed_plays UInt64,
  starts UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (company_id, campaign_id, locality, day);
