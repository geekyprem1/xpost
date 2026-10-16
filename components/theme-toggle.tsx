"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("shotlark-theme", dark ? "dark" : "light");
    } catch (error) {
      void error;
    }
  }

  return (
    <Button variant="ghost" size="icon" type="button" onClick={toggle} aria-label="Toggle theme">
      <Sun className="hidden dark:block" aria-hidden />
      <Moon className="block dark:hidden" aria-hidden />
    </Button>
  );
}
