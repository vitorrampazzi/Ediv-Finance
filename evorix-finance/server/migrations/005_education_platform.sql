CREATE TABLE IF NOT EXISTS ranking_publications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  author_name VARCHAR(120) NULL,
  professional_category VARCHAR(120) NULL,
  professional_registration VARCHAR(120) NULL,
  source_file_name VARCHAR(255) NOT NULL,
  entries_json JSON NOT NULL,
  imported_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT ranking_publication_user_fk FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  CONSTRAINT reset_token_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS request_limits (
  bucket CHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  hits INT UNSIGNED NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  KEY request_limits_expiry_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  ticker VARCHAR(16) NOT NULL,
  kind ENUM('DIVIDEND','JCP','SPLIT','BONUS') NOT NULL,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  factor DECIMAL(20,8) NOT NULL DEFAULT 1,
  occurred_at DATE NOT NULL,
  status ENUM('RECEIVED','ANNOUNCED') NOT NULL DEFAULT 'RECEIVED',
  note VARCHAR(300) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY portfolio_events_user_date_idx (user_id, occurred_at),
  CONSTRAINT portfolio_event_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT portfolio_event_positive CHECK (amount >= 0 AND factor > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_imports (
  user_id CHAR(36) NOT NULL,
  fingerprint CHAR(64) CHARACTER SET ascii NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, fingerprint),
  CONSTRAINT portfolio_import_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_threads (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  subject VARCHAR(160) NOT NULL,
  status ENUM('RECEIVED','IN_PROGRESS','ANSWERED') NOT NULL DEFAULT 'RECEIVED',
  share_portfolio BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT support_thread_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  thread_id CHAR(36) NOT NULL,
  author_id CHAR(36) NULL,
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  body TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT support_message_thread_fk FOREIGN KEY (thread_id) REFERENCES support_threads(id) ON DELETE CASCADE,
  CONSTRAINT support_message_author_fk FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provider_cache (
 cache_key VARCHAR(100) CHARACTER SET ascii NOT NULL PRIMARY KEY,
 payload JSON NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 KEY provider_cache_expiry_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ranking_publications (title,source_file_name,entries_json,created_at)
SELECT 'Ranking anterior à atualização', MAX(source_file_name),
 JSON_ARRAYAGG(JSON_OBJECT('rank',rank_position,'ticker',ticker,'companyName',company_name,'expectedReturnPercent',CAST(expected_return_percent AS CHAR),'targetPrice',CAST(target_price AS CHAR),'horizonMonths',horizon_months,'thesis',thesis,'risks',NULL,'sector',NULL)), MAX(created_at)
FROM income_ranking_entries
WHERE NOT EXISTS (SELECT 1 FROM ranking_publications)
HAVING COUNT(*) > 0;
