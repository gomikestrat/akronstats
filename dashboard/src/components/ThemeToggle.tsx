import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
    theme: "light" | "dark";
    onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
    return (
        <button
            className="theme-toggle"
            onClick={onToggle}
            title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
    );
}
