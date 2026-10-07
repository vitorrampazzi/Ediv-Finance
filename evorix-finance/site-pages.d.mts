export const siteOrigin: string;
export const publicPages: Record<
  string,
  { title: string; description: string }
>;
export const accountPaths: string[];
export function normalizedPath(path: string): string;
export function pageMetadata(
  path: string,
  qa?: boolean,
): {
  title: string;
  description: string;
  canonical: string | null;
  noindex: boolean;
};
