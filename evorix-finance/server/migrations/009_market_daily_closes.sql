CREATE TABLE IF NOT EXISTS market_daily_closes (
 ticker VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 trade_date DATE NOT NULL,
 close DECIMAL(20,8) NOT NULL,
 volume BIGINT UNSIGNED NULL,
 source VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 captured_at DATETIME(3) NOT NULL,
 PRIMARY KEY (ticker, trade_date),
 KEY market_daily_closes_date_idx (trade_date),
 CONSTRAINT market_daily_closes_close_positive CHECK (close > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
