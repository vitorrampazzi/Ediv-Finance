import { Tooltip } from "./Tooltip";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

export function ThemeToggle() {
  const { theme, setPreference } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label =
    nextTheme === "light" ? "Ativar tema claro" : "Ativar tema escuro";
  return (
    <Tooltip content={label}>
      <button
        type="button"
        className="ediv-theme-control ediv-chrome-icon"
        aria-label={label}
        onClick={() => setPreference(nextTheme)}
      >
        <Sun className="ediv-theme-light-icon" size={19} aria-hidden="true" />
        <Moon className="ediv-theme-dark-icon" size={19} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
