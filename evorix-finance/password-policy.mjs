export const passwordMinLength = 8;
export const passwordMaxLength = 128;
export const passwordPolicyHint =
  "Use de 8 a 128 caracteres, com pelo menos uma letra maiúscula, um número e um caractere especial. Espaços não contam como caractere especial.";

export function isValidNewPassword(value) {
  return (
    typeof value === "string" &&
    value.length <= passwordMaxLength &&
    Array.from(value).length >= passwordMinLength &&
    /\p{Lu}/u.test(value) &&
    /\p{Nd}/u.test(value) &&
    /[\p{P}\p{S}]/u.test(value)
  );
}
