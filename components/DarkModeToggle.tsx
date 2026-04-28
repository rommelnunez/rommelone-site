"use client";

import { useTheme } from "./ThemeProvider";

export default function DarkModeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="w-5 h-5 rounded-full border-2 border-current overflow-hidden relative cursor-pointer"
      title="Toggle dark mode"
    >
      <span
        className="absolute inset-0 bg-current transition-transform duration-300"
        style={{
          clipPath:
            theme === "dark"
              ? "inset(0 0 0 0)"
              : "inset(0 50% 0 0)",
        }}
      />
    </button>
  );
}
