CREATE TABLE IF NOT EXISTS research_drafts (
 id CHAR(36) NOT NULL PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 title VARCHAR(160) NOT NULL,
 payload JSON NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 KEY research_drafts_owner_idx(user_id,updated_at),
 CONSTRAINT research_draft_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS learning_progress (
 user_id CHAR(36) NOT NULL,
 lesson_id VARCHAR(40) NOT NULL,
 completed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(user_id,lesson_id),
 CONSTRAINT learning_progress_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ranking_changes (
 publication_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
 changed_tickers JSON NOT NULL,
 CONSTRAINT ranking_change_publication_fk FOREIGN KEY(publication_id) REFERENCES ranking_publications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS notification_reads (
 user_id CHAR(36) NOT NULL,
 publication_id BIGINT UNSIGNED NOT NULL,
 read_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(user_id,publication_id),
 CONSTRAINT notification_read_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT notification_read_publication_fk FOREIGN KEY(publication_id) REFERENCES ranking_publications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
