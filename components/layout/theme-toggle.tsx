"use client";

import {useEffect, useState} from "react";
import {Monitor, Moon, Sun} from "lucide-react";
import {cn} from "@/lib/utils";

type Mode = "system" | "light" | "dark";

function applyMode(mode: Mode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && prefersDark);

  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const saved = (localStorage.getItem("reliva-theme") as Mode) || "light";
    setMode(saved);
    applyMode(saved);
  }, []);

  function choose(next: Mode) {
    setMode(next);
    localStorage.setItem("reliva-theme", next);
    applyMode(next);
  }

  const options = [
    {mode: "system" as const, label: "System", Icon: Monitor},
    {mode: "light" as const, label: "Light", Icon: Sun},
    {mode: "dark" as const, label: "Dark", Icon: Moon},
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/70 p-0.5">
      {options.map(({mode: option, label, Icon}) => (
        <button
          key={option}
          type="button"
          aria-label={`${label} theme`}
          onClick={() => choose(option)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-muted-foreground transition",
            mode === option && "bg-card text-foreground shadow-sm"
          )}
        >
          <Icon className="size-3.5" strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}
