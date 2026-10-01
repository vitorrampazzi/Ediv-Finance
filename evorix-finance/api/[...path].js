// Vercel routes /api/* requests through this function. Express keeps the
// existing /api/... route paths, so the same app remains usable locally.
import { app } from '../server/app.js';

export default app;
