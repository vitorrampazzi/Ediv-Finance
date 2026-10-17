import { Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "../lib/theme";

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <label
      className="ediv-theme-control ediv-chrome-icon"
      title="Escolher aparência"
    >
      <Sun className="ediv-theme-light-icon" size={19} aria-hidden="true" />
      <Moon className="ediv-theme-dark-icon" size={19} aria-hidden="true" />
      <span className="sr-only">Aparência</span>
      <select
        className="ediv-theme-select"
        value={preference}
        onChange={(event) =>
          setPreference(event.target.value as ThemePreference)
        }
      >
        <option value="system">Tema do sistema</option>
        <option value="light">Tema claro</option>
        <option value="dark">Tema escuro</option>
      </select>
    </label>
  );
}
