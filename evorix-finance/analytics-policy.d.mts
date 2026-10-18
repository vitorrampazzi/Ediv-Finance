export const analyticsConsentKey: string;
export const analyticsConsentVersion: string;
export const analyticsConsentLifetime: number;
export const configuredMeasurementId: string;
export type AnalyticsChoice = "granted" | "denied" | null;
export interface ConsentState {
  choice: AnalyticsChoice;
  persisted: boolean;
}
export function validMeasurementId(value: unknown): boolean;
export function analyticsReferrer(value: string): string;
export function analyticsPage(
  pathname: string,
): { path: string; title: string } | null;
export function createConsentStore(
  storage?: Pick<Storage, "getItem" | "setItem">,
  now?: () => number,
): {
  get(): ConsentState;
  subscribe(listener: () => void): () => void;
  choose(choice: "granted" | "denied"): void;
  reconcile(): void;
};
export function createAnalyticsController(options: {
  measurementId: string;
  origin: string;
  enqueue: (...args: unknown[]) => void;
  loadTag: (id: string) => void;
  setDisabled: (disabled: boolean) => void;
  clearCookies: () => void;
  initialReferrer?: string;
}): {
  configured: boolean;
  allowedOrigin: boolean;
  update(options: {
    choice: AnalyticsChoice;
    pathname: string;
    audienceAllowed?: boolean;
  }): boolean;
};
