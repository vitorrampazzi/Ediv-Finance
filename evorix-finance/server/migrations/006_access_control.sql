CREATE TABLE IF NOT EXISTS user_access (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  role ENUM('USER','ANALYST','ADMIN') NOT NULL DEFAULT 'USER',
  blocked_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY user_access_role_idx (role, blocked_at),
  CONSTRAINT user_access_owner_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS admin_control (
  id TINYINT NOT NULL PRIMARY KEY,
  legacy_imported BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO admin_control(id) VALUES(1);
CREATE TABLE IF NOT EXISTS admin_audit_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  actor_id CHAR(36) NULL,
  target_id CHAR(36) NULL,
  action VARCHAR(40) NOT NULL,
  before_state JSON NULL,
  after_state JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY admin_audit_created_idx (created_at),
  CONSTRAINT admin_audit_actor_fk FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT admin_audit_target_fk FOREIGN KEY(target_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
