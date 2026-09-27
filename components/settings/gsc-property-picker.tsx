"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {Check, ChevronDown, LoaderCircle} from "lucide-react";
import {cn} from "@/lib/utils";

type GscProperty = {
  siteUrl: string;
  permissionLevel: string;
};

type Props = {
  siteId: string;
  currentProperty: string | null;
};

export function GscPropertyPicker({siteId, currentProperty}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [properties, setProperties] = useState<GscProperty[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadProperties() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (properties.length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gsc/properties", {cache: "no-store"});
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "Search Console properties kunne ikke hentes");
      }
      setProperties(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search Console properties kunne ikke hentes");
    } finally {
      setLoading(false);
    }
  }

  async function choose(property: string) {
    setSaving(property);
    setError(null);
    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({gscProperty: property}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Property kunne ikke gemmes");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Property kunne ikke gemmes");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={loadProperties}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#cfd9e4] bg-white px-3 text-xs font-semibold text-[#26374b] shadow-sm transition hover:border-[#abc4d8] hover:bg-[#f8fbfd]"
      >
        {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <ChevronDown className="size-3.5" />}
        {currentProperty ? "Skift property" : "Vælg Search Console-property"}
      </button>

      {open ? (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-[var(--shadow-2)]">
          {loading ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Henter read-only properties…</p>
          ) : properties.length === 0 ? (
            <p className="px-3 py-3 text-xs leading-5 text-muted-foreground">
              Ingen Search Console-properties blev returneret for den godkendte Google-konto.
            </p>
          ) : (
            properties.map((property) => {
              const selected = property.siteUrl === currentProperty;
              return (
                <button
                  key={property.siteUrl}
                  type="button"
                  disabled={Boolean(saving)}
                  onClick={() => choose(property.siteUrl)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition hover:bg-[#f4f7fa] disabled:opacity-60",
                    selected && "bg-[#eff9f4]"
                  )}
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                    {saving === property.siteUrl ? (
                      <LoaderCircle className="size-3.5 animate-spin text-[#3d88df]" />
                    ) : selected ? (
                      <Check className="size-3.5 text-[#159264]" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block break-all text-xs font-semibold text-foreground">
                      {property.siteUrl}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      Google permission: {property.permissionLevel}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[11px] leading-5 text-[#b46f16]">{error}</p> : null}
    </div>
  );
}
