"use client";

import {useTransition} from "react";
import {useLocale} from "next-intl";
import {useRouter} from "next/navigation";
import {cn} from "@/lib/utils";
import {setRelivaLocale} from "@/components/layout/locale-actions";

const locales = ["da", "en"] as const;

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: (typeof locales)[number]) {
    startTransition(async () => {
      await setRelivaLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="hidden items-center gap-0.5 rounded-lg border border-border bg-white p-0.5 sm:flex">
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          disabled={isPending}
          aria-label={`Switch language to ${option === "da" ? "Danish" : "English"}`}
          aria-pressed={locale === option}
          onClick={() => choose(option)}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground transition disabled:opacity-60",
            locale === option && "bg-[#eef3f7] text-foreground"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
