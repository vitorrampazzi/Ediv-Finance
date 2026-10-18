import { passwordPolicyHint } from "../../password-policy.mjs";

export function PasswordRequirements({ id }: { id: string }) {
  return (
    <p id={id} className="mt-2 text-xs leading-6 text-evo-textSec">
      {passwordPolicyHint} Não reutilize a senha de outro serviço.
    </p>
  );
}
