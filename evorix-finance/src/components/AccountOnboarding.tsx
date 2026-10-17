import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useOnboarding } from "../lib/onboarding";
import { cleanOnboardingDestination } from "../../onboarding.mjs";
import { GuidedTour } from "./GuidedTour";

export function AccountOnboarding() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const requested = params.get("introducao") === "1";
  const current = location.pathname + location.search + location.hash;
  const destination = cleanOnboardingDestination(
    requested ? params.get("destino") : current,
  );
  const onboarding = useOnboarding(user, destination, requested);
  const { restart } = onboarding;

  useEffect(() => {
    const replay = () => restart(current);
    window.addEventListener("ediv:replay-onboarding", replay);
    return () => window.removeEventListener("ediv:replay-onboarding", replay);
  }, [current, restart]);

  // A reused verification link must not keep its introduction marker in history
  // once this browser already completed the tour for this account.
  useEffect(() => {
    if (requested && !onboarding.active)
      navigate(destination, { replace: true });
  }, [requested, onboarding.active, destination, navigate]);

  return (
    <>
      <GuidedTour
        active={onboarding.active}
        step={onboarding.step}
        onStepChange={onboarding.setStep}
        onComplete={() => {
          onboarding.complete();
          navigate(onboarding.returnTo, { replace: true });
        }}
        notice={
          !onboarding.persisted
            ? "Este navegador bloqueou o salvamento. Sua introdução continua nesta sessão."
            : undefined
        }
      />
    </>
  );
}
