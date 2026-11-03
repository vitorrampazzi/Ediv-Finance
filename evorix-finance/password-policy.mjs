export const passwordMinLength = 8;
export const passwordMaxLength = 128;
export const passwordPolicyHint =
  "Use de 8 a 128 caracteres, com uma letra maiúscula, um número e um símbolo (espaço não conta).";

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
