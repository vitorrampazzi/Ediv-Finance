export function ResearchSources({ text }: { text?: string | null }) {
  if (!text?.trim())
    return (
      <p className="text-sm leading-6 text-evo-textSec">
        A fonte não foi informada nesta publicação. Confira a origem dos dados
        antes de interpretar os números.
      </p>
    );
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-evo-textSec">
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
        if (!/^https?:\/\//.test(part)) return <span key={index}>{part}</span>;
        const url = part.replace(/[.,;)\]}]+$/, "");
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
            return <span key={index}>{part}</span>;
          return (
            <span key={index}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-evo-accent underline"
              >
                {url}
                <span className="sr-only"> (abre em nova guia)</span>
              </a>
              {part.slice(url.length)}
            </span>
          );
        } catch {
          return <span key={index}>{part}</span>;
        }
      })}
    </div>
  );
}
