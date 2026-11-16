// The name is typed by whoever fills the sign-up form, and the confirmation
// goes to an address that person may not own. Only a plain name (letters,
// spaces, apostrophe, hyphen) is repeated in the message, so the form cannot be
// used to deliver a link or an arbitrary text under the Escola's sender.
const plainName = /^[\p{L}\p{M}][\p{L}\p{M}' -]{1,59}$/u;

export function emailGreeting(name) {
  const text =
    typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  return plainName.test(text) ? `Olá, ${text}.` : "Olá.";
}
