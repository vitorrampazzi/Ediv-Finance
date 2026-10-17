export const onboardingStoragePrefix: string;
export const onboardingStepCount: number;
export interface OnboardingUser {
  id: string;
  emailVerified: boolean;
  createdAt: string;
}
export interface OnboardingState {
  active: boolean;
  step: number;
  returnTo: string;
  persisted: boolean;
}
export function onboardingEligible(user: OnboardingUser | null): boolean;
export function cleanOnboardingDestination(value: unknown): string;
export function onboardingEntryDestination(destination: string): string;
export function createOnboardingStore(
  storage?: Pick<Storage, "getItem" | "setItem">,
): {
  get(
    user: OnboardingUser | null,
    destination?: string,
    requested?: boolean,
  ): OnboardingState | null;
  subscribe(listener: () => void): () => void;
  persist(user: OnboardingUser): OnboardingState | null;
  setStep(user: OnboardingUser, step: number): OnboardingState | null;
  complete(user: OnboardingUser): OnboardingState | null;
  restart(user: OnboardingUser, destination: string): OnboardingState | null;
  sync(storageKey: string | null): void;
};
