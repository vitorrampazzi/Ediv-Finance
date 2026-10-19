CREATE TABLE IF NOT EXISTS notification_events (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 type VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 source_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 editorial_version VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 publication_id BIGINT UNSIGNED NULL,
 title VARCHAR(200) NOT NULL,
 description VARCHAR(1000) NOT NULL,
 href VARCHAR(500) NOT NULL,
 changed_tickers JSON NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY notification_source_version(type,source_id,editorial_version),
 UNIQUE KEY notification_publication(publication_id),
 KEY notification_created(created_at,id),
 CONSTRAINT notification_event_publication_fk FOREIGN KEY(publication_id) REFERENCES ranking_publications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_event_reads (
 user_id CHAR(36) NOT NULL,
 notification_id BIGINT UNSIGNED NOT NULL,
 read_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(user_id,notification_id),
 CONSTRAINT notification_event_read_user_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT notification_event_read_event_fk FOREIGN KEY(notification_id) REFERENCES notification_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS research_publication_keys (
 fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 publication_id BIGINT UNSIGNED NOT NULL,
 CONSTRAINT research_key_publication_fk FOREIGN KEY(publication_id) REFERENCES ranking_publications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO research_publication_keys(fingerprint,publication_id)
SELECT SHA2(CAST(JSON_OBJECT('title',title,'authorName',author_name,'professionalCategory',professional_category,'professionalRegistration',professional_registration,'entries',entries_json) AS CHAR CHARACTER SET utf8mb4),256),MIN(id)
FROM ranking_publications
GROUP BY SHA2(CAST(JSON_OBJECT('title',title,'authorName',author_name,'professionalCategory',professional_category,'professionalRegistration',professional_registration,'entries',entries_json) AS CHAR CHARACTER SET utf8mb4),256)
ON DUPLICATE KEY UPDATE fingerprint=research_publication_keys.fingerprint;

INSERT INTO notification_events(type,source_id,editorial_version,publication_id,title,description,href,changed_tickers,created_at)
SELECT 'research',CAST(p.id AS CHAR),'1',p.id,p.title,'Uma publicação de pesquisa está disponível.',CONCAT('/app/ranking?publication=',p.id),COALESCE(c.changed_tickers,JSON_ARRAY()),p.created_at
FROM ranking_publications p LEFT JOIN ranking_changes c ON c.publication_id=p.id ORDER BY p.id
ON DUPLICATE KEY UPDATE id=notification_events.id;

INSERT INTO notification_event_reads(user_id,notification_id,read_at)
SELECT r.user_id,e.id,r.read_at FROM notification_reads r JOIN notification_events e ON e.publication_id=r.publication_id
ON DUPLICATE KEY UPDATE read_at=notification_event_reads.read_at;
