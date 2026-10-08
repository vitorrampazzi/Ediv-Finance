import { helpTopics } from "./supportHelp";

export type SupportThread = {
  id: string;
  subject: string;
  status: string;
  share_portfolio: boolean;
  user_id: string;
  updated_at: string;
  name?: string;
};

export type SupportConversation = {
  thread: SupportThread;
  messages: {
    id: string;
    is_staff: boolean;
    body: string;
    created_at: string;
  }[];
  portfolio:
    | null
    | {
        ticker: string;
        side: string;
        quantity: string;
        unit_price: string;
      }[];
};

export type SupportInformation = {
  email: string;
  hours: string;
  professionalName: string;
  category: string;
  registration: string;
};

export const supportStatuses = {
  RECEIVED: "Aguardando equipe",
  IN_PROGRESS: "Em atendimento",
  ANSWERED: "Respondida",
};

export function supportStatusLabel(status: string) {
  return (
    supportStatuses[status as keyof typeof supportStatuses] || "Atualizada"
  );
}

export function supportDate(value: string) {
  const normalized = value.replace(" ", "T");
  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized) ? normalized : normalized + "Z",
  );
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const normalizeSupportSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

export function supportSubject(subject: string) {
  const topic = helpTopics.find((item) =>
    subject.startsWith("[" + item.title + "] "),
  );
  return {
    topic,
    title: topic ? subject.slice(topic.title.length + 3) : subject,
  };
}
