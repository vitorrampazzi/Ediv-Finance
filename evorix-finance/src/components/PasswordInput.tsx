import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  id: string;
  visibilityLabel?: string;
  containerClassName?: string;
};

export function PasswordInput({
  id,
  visibilityLabel = "senha",
  containerClassName = "",
  className = "field",
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const action = visible ? "Ocultar" : "Mostrar";
  return (
    <div className={`relative ${containerClassName}`}>
      <input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`${className} pr-28`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        aria-label={`${action} ${visibilityLabel}`}
        aria-controls={id}
        aria-pressed={visible}
        title={`${action} ${visibilityLabel}`}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-1 my-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-evo-textSec hover:text-evo-textMain focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent disabled:opacity-50"
      >
        {visible ? (
          <EyeOff size={18} aria-hidden="true" />
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
        {action}
      </button>
    </div>
  );
}
