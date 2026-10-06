import type { AuthUser } from "../context/AuthProvider";
export const roleLabels = {
  USER: "Usuário",
  ANALYST: "Analista",
  ADMIN: "Administrador",
};
export const userCan = (user: AuthUser | null, permission: string) =>
  Boolean(user && user.permissions?.includes(permission));
