// main keeps this false; QA enables it in its own branch.
export const assistantInQa = true;

export function assistantFeatureEnabled(env = process.env) {
  // A preview must never enable the assistant when promoted to production.
  if (env.VERCEL_ENV === "production") return false;
  return assistantInQa || env.EDIV_ASSISTANT_PREVIEW === "true";
}
