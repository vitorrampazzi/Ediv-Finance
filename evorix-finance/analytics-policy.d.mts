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
export function analyticsCampaign(search: string): string;
export type AnalyticsEventName =
  | "click_signup"
  | "click_login"
  | "click_stock_card"
  | "start_signup"
  | "complete_signup"
  | "complete_login"
  | "click_navigation"
  | "click_home_area"
  | "click_content"
  | "open_faq"
  | "change_theme"
  | "open_indicator_help"
  | "view_research_section"
  | "change_chart_view"
  | "start_lesson"
  | "play_lesson_video"
  | "complete_lesson"
  | "search_glossary";
export const analyticsEvents: Readonly<
  Record<AnalyticsEventName, Record<string, readonly (string | number)[]>>
>;
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
  initialSearch?: string;
}): {
  configured: boolean;
  allowedOrigin: boolean;
  update(options: {
    choice: AnalyticsChoice;
    pathname: string;
    audienceAllowed?: boolean;
  }): boolean;
  track(
    name: AnalyticsEventName,
    params?: Record<string, string | number>,
  ): boolean;
};
