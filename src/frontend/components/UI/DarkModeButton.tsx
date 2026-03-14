"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders on the client to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder of the exact same size to avoid layout shift
    return <div className="h-10 w-10" />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      aria-label="Toggle theme"
    >
      {/* Sun Icon: Visible in light mode, scales down and rotates away in dark mode */}
      <Sun className="absolute h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0" />
      
      {/* Moon Icon: Hidden in light mode, rotates in and scales up in dark mode */}
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100" />
    </button>
  );
}