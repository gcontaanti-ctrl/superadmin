import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl h-8 px-2.5 transition-all duration-200 border cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-cyan-400/40 ${
        isDark
          ? "border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 hover:text-amber-200"
          : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
      } ${className}`}
      title={isDark ? "Ativar Modo Claro (Visual Branco)" : "Ativar Modo Escuro (Visual Midnight)"}
      aria-label="Alternar tema claro e escuro"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-blue-600 transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </div>

      {showLabel ? (
        <span className="text-xs font-semibold">
          {isDark ? "Modo Claro" : "Modo Escuro"}
        </span>
      ) : (
        <span className="hidden xl:inline text-xs font-medium">
          {isDark ? "Tema Claro" : "Tema Escuro"}
        </span>
      )}
    </button>
  );
}

