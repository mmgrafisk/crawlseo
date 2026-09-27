"use client";

import {useSyncExternalStore} from "react";
import {Monitor, Moon, Sun} from "lucide-react";
import {cn} from "@/lib/utils";

type Mode = "system" | "light" | "dark";

const THEME_EVENT = "reliva-theme-change";

function getMode(): Mode {
  const saved = localStorage.getItem("reliva-theme");
  return saved === "system" || saved === "dark" || saved === "light" ? saved : "light";
}

function applyMode(mode: Mode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && prefersDark);

  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
}

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    applyMode(getMode());
    onStoreChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(THEME_EVENT, handleChange);
  media.addEventListener("change", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(THEME_EVENT, handleChange);
    media.removeEventListener("change", handleChange);
  };
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "light" as Mode);

  function choose(next: Mode) {
    localStorage.setItem("reliva-theme", next);
    applyMode(next);
    window.dispatchEvent(new Event(THEME_EVENT));
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
