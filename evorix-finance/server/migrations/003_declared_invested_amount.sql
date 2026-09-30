CREATE TABLE IF NOT EXISTS user_financial_summaries (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  declared_invested_amount DECIMAL(18,2) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT user_financial_summaries_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT declared_invested_amount_nonnegative CHECK (declared_invested_amount IS NULL OR declared_invested_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
