// Storage ceilings per account. Without them one confirmed account could keep
// adding rows until the managed MySQL plan ran out of space, and every read of
// that account would load all of them. The values sit far above normal use;
// the request limits by IP stay as they were.
export const accountLimits = Object.freeze({
  portfolioTransactions: 10_000,
  portfolioEvents: 2_000,
  favorites: 300,
  supportThreadsPerDay: 10,
  supportMessagesPerDay: 200,
});

// True when `adding` more rows would pass `maximum`.
export function exceedsAccountLimit(current, adding, maximum) {
  const total = Number(current) + Number(adding);
  return !Number.isFinite(total) || total > maximum;
}

const thousands = (value) =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const accountLimitMessages = Object.freeze({
  portfolioTransactions: `Limite de ${thousands(accountLimits.portfolioTransactions)} operações por conta atingido. Exclua operações antigas para registrar novas.`,
  portfolioEvents: `Limite de ${thousands(accountLimits.portfolioEvents)} eventos por conta atingido. Exclua eventos antigos para registrar novos.`,
  favorites: `Limite de ${accountLimits.favorites} favoritos por conta atingido. Remova um favorito para adicionar outro.`,
  supportThreads:
    "Você abriu muitas conversas hoje. Continue em uma conversa existente ou tente novamente amanhã.",
  supportMessages:
    "Você enviou muitas mensagens hoje. Tente novamente amanhã.",
});
