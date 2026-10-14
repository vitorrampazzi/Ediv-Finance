const importTransparencia = () => import("../pages/Transparencia");

// The router and navigation hints share these statically analyzable imports.
// Importing a page loads its code; it does not mount the page or fetch its data.
export const pageImports = {
  home: () => import("../pages/Home"),
  memberHome: () => import("../pages/MemberHome"),
  dashboard: () => import("../layouts/DashboardLayout"),
  analises: () => import("../pages/analises"),
  ranking: () => import("../pages/IncomeRanking"),
  stockResearch: () => import("../pages/StockResearch"),
  aprender: () => import("../pages/Aprender"),
  glossario: () => import("../pages/Glossario"),
  assessoria: () => import("../pages/Assessoria"),
  metodologia: () => import("../pages/Metodologia"),
  privacidade: importTransparencia,
  suporte: importTransparencia,
  conversas: () => import("../pages/Conversas"),
  perfil: () => import("../pages/Perfil"),
  configuracoes: () => import("../pages/Configuracoes"),
  admin: () => import("../pages/Admin"),
  login: () => import("../pages/auth/LoginPage"),
  register: () => import("../pages/auth/RegisterPage"),
  verify: () => import("../pages/auth/VerifyEmailPage"),
  forgot: () => import("../pages/auth/ForgotPasswordPage"),
  reset: () => import("../pages/auth/ResetPasswordPage"),
} as const;
