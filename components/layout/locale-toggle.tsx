"use client";

import {useLocale} from "next-intl";
import {useRouter} from "next/navigation";
import {cn} from "@/lib/utils";

const locales = ["da", "en"] as const;

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();

  function choose(next: (typeof locales)[number]) {
    document.cookie = `RELIVA_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="hidden items-center gap-0.5 rounded-lg border border-border bg-white p-0.5 sm:flex">
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          aria-label={`Switch language to ${option === "da" ? "Danish" : "English"}`}
          onClick={() => choose(option)}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground transition",
            locale === option && "bg-[#eef3f7] text-foreground"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
