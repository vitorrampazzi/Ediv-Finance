const common = [
  "rankings:read",
  "learning:read",
  "portfolio:own",
  "favorites:own",
  "assistant:use",
  "support:own",
];
const team = ["rankings:write", "support:manage"];
const permissionsByRole = Object.freeze({
  USER: Object.freeze([...common]),
  ANALYST: Object.freeze([...common, ...team]),
  ADMIN: Object.freeze([
    ...common,
    ...team,
    "users:read",
    "users:manage",
    "audit:read",
  ]),
});
export const permissionsForRole = (role) => [
  ...(Object.hasOwn(permissionsByRole, role) ? permissionsByRole[role] : []),
];
export const hasPermission = (user, permission) =>
  Boolean(
    user &&
    !user.blocked &&
    Object.hasOwn(permissionsByRole, user.role) &&
    permissionsByRole[user.role].includes(permission),
  );
export function requirePermission(permission) {
  return (req, res, next) =>
    hasPermission(req.authenticatedUser, permission)
      ? next()
      : res
          .status(403)
          .json({ error: "Sua conta não tem permissão para esta ação." });
}
export async function lockAccessControl(connection) {
  const [rows] = await connection.execute(
    "SELECT id FROM admin_control WHERE id=1 FOR UPDATE",
  );
  if (!rows.length) throw new Error("Access control migration is required");
}
export async function activeAdministratorCount(connection) {
  const [rows] = await connection.execute(
    "SELECT COUNT(*) AS total FROM user_access a JOIN users u ON u.id=a.user_id WHERE a.role='ADMIN' AND a.blocked_at IS NULL AND u.email_verified_at IS NOT NULL",
  );
  return Number(rows[0].total);
}
export async function lockActiveUser(connection, id) {
  const [rows] = await connection.execute(
    "SELECT u.email_verified_at,COALESCE(a.role,'USER') AS role,a.blocked_at FROM users u LEFT JOIN user_access a ON a.user_id=u.id WHERE u.id=? FOR UPDATE",
    [id],
  );
  const row = rows[0];
  return row && row.email_verified_at && !row.blocked_at
    ? { role: row.role }
    : null;
}
