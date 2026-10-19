// Keep this expression in sync with the legacy backfill in 008_notifications.sql.
export async function researchFingerprint(connection, metadata, entries) {
  const [rows] = await connection.execute(
    `SELECT SHA2(CAST(JSON_OBJECT('title',?,'authorName',?,
      'professionalCategory',?,'professionalRegistration',?,
      'entries',CAST(? AS JSON)) AS CHAR CHARACTER SET utf8mb4),256) AS fingerprint`,
    [...metadata, JSON.stringify(entries)],
  );
  return rows[0].fingerprint;
}

export async function createResearchEvent(connection, publicationId) {
  await connection.execute(
    `INSERT INTO notification_events
      (type,source_id,editorial_version,publication_id,title,description,href,changed_tickers,created_at)
      SELECT 'research',CAST(p.id AS CHAR),'1',p.id,p.title,
        'Uma publicação de pesquisa está disponível.',
        CONCAT('/app/ranking?publication=',p.id),COALESCE(c.changed_tickers,JSON_ARRAY()),p.created_at
      FROM ranking_publications p LEFT JOIN ranking_changes c ON c.publication_id=p.id WHERE p.id=?
      ON DUPLICATE KEY UPDATE id=notification_events.id`,
    [publicationId],
  );
}
