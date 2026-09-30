CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  side ENUM('BUY', 'SELL') NOT NULL,
  ticker VARCHAR(16) NOT NULL,
  asset_name VARCHAR(120) NOT NULL,
  asset_type ENUM('ACAO', 'FII', 'ETF', 'RENDA_FIXA', 'CRYPTO', 'OUTRO') NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  unit_price DECIMAL(20,8) NOT NULL,
  fees DECIMAL(20,8) NOT NULL DEFAULT 0,
  traded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY portfolio_user_date_idx (user_id, traded_at, created_at, id),
  KEY portfolio_ticker_idx (user_id, ticker),
  CONSTRAINT portfolio_transactions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT portfolio_quantity_positive CHECK (quantity > 0),
  CONSTRAINT portfolio_price_positive CHECK (unit_price > 0),
  CONSTRAINT portfolio_fees_nonnegative CHECK (fees >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  risk_profile ENUM('CONSERVADOR', 'MODERADO', 'ARROJADO') NULL,
  email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT user_preferences_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id CHAR(36) NOT NULL,
  ticker VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, ticker),
  CONSTRAINT user_favorites_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
