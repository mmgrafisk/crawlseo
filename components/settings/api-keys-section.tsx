"use client";

import {useState} from "react";
import {
  CheckCircle2,
  FlaskConical,
  Gauge,
  KeyRound,
  Loader2,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import {cn} from "@/lib/utils";

type ApiKeyStatus = Record<string, {connected: boolean; updatedAt?: string}>;

export function ApiKeysSection({initialStatus}: {initialStatus: ApiKeyStatus}) {
  const [status, setStatus] = useState<ApiKeyStatus>(initialStatus);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagespeedKey, setPagespeedKey] = useState("");
  const [pagespeedSaving, setPagespeedSaving] = useState(false);
  const [pagespeedDeleting, setPagespeedDeleting] = useState(false);
  const [pagespeedError, setPagespeedError] = useState<string | null>(null);

  const isConnected = status.dataforseo?.connected ?? false;
  const isPagespeedConnected = status.google_pagespeed?.connected ?? false;

  async function handleTest() {
    if (!login || !password) return;
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch("/api/user/api-keys/test", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({login, password}),
      });
      const data = await response.json();
      setTestResult(data.success === true);
      if (!data.success) setError("Forbindelsen kunne ikke valideres.");
    } catch {
      setTestResult(false);
      setError("Forbindelsestesten fejlede.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!login || !password) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({provider: "dataforseo", login, password}),
      });

      if (response.ok) {
        setStatus((previous) => ({
          ...previous,
          dataforseo: {connected: true, updatedAt: new Date().toISOString()},
        }));
        setLogin("");
        setPassword("");
        setTestResult(null);
      } else {
        const data = await response.json();
        setError(data.error || "Nøglen kunne ikke gemmes.");
      }
    } catch {
      setError("Nøglen kunne ikke gemmes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({provider: "dataforseo"}),
      });
      if (response.ok) {
        setStatus((previous) => ({...previous, dataforseo: {connected: false}}));
      }
    } catch {
      setError("Nøglen kunne ikke fjernes.");
    } finally {
      setDeleting(false);
    }
  }

  async function handlePagespeedSave() {
    if (!pagespeedKey) return;
    setPagespeedSaving(true);
    setPagespeedError(null);

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({provider: "google_pagespeed", apiKey: pagespeedKey}),
      });
      if (response.ok) {
        setStatus((previous) => ({
          ...previous,
          google_pagespeed: {connected: true, updatedAt: new Date().toISOString()},
        }));
        setPagespeedKey("");
      } else {
        const data = await response.json();
        setPagespeedError(data.error || "API-nøglen kunne ikke gemmes.");
      }
    } catch {
      setPagespeedError("API-nøglen kunne ikke gemmes.");
    } finally {
      setPagespeedSaving(false);
    }
  }

  async function handlePagespeedDelete() {
    setPagespeedDeleting(true);
    setPagespeedError(null);

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({provider: "google_pagespeed"}),
      });
      if (response.ok) {
        setStatus((previous) => ({...previous, google_pagespeed: {connected: false}}));
      }
    } catch {
      setPagespeedError("API-nøglen kunne ikke fjernes.");
    } finally {
      setPagespeedDeleting(false);
    }
  }

  return (
    <section id="api-keys" className="reliva-panel overflow-hidden scroll-mt-20">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#edf5ff] text-[#3d88df]">
            <KeyRound className="size-4.5" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Eksterne API-forbindelser</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Tilføj kun de providers Reliva faktisk skal bruge. Credentials håndteres server-side.
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        <ProviderRow
          icon={Search}
          name="DataForSEO"
          description="Keyword research, domain intelligence og backlink-data. Ekstern SEO-datakilde, ikke source of truth for Google-regler."
          connected={isConnected}
          updatedAt={status.dataforseo?.updatedAt}
        >
          {isConnected ? (
            <RemoveButton loading={deleting} onClick={handleDelete} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Login">
                <input
                  type="text"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  placeholder="navn@firma.dk"
                  className={inputClass}
                />
              </Field>
              <Field label="API password">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className={inputClass}
                />
              </Field>
              <div className="md:col-span-2">
                {error ? <Feedback tone="error">{error}</Feedback> : null}
                {testResult === true ? <Feedback tone="success">Forbindelsen er valideret.</Feedback> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={!login || !password || testing}
                    className={secondaryButtonClass}
                  >
                    {testing ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
                    Test forbindelse
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!login || !password || saving}
                    className={primaryButtonClass}
                  >
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    Gem credentials
                  </button>
                </div>
              </div>
            </div>
          )}
        </ProviderRow>

        <ProviderRow
          icon={Gauge}
          name="Google PageSpeed Insights"
          description="Core Web Vitals og Lighthouse lab-data. Reliva foretrækker en bruger-/organisationsnøgle frem for en delt global quota."
          connected={isPagespeedConnected}
          updatedAt={status.google_pagespeed?.updatedAt}
        >
          {isPagespeedConnected ? (
            <RemoveButton loading={pagespeedDeleting} onClick={handlePagespeedDelete} />
          ) : (
            <div>
              <Field label="API key">
                <input
                  type="password"
                  value={pagespeedKey}
                  onChange={(event) => setPagespeedKey(event.target.value)}
                  placeholder="AIza…"
                  className={inputClass}
                />
              </Field>
              {pagespeedError ? <Feedback tone="error">{pagespeedError}</Feedback> : null}
              <button
                type="button"
                onClick={handlePagespeedSave}
                disabled={!pagespeedKey || pagespeedSaving}
                className={cn(primaryButtonClass, "mt-3")}
              >
                {pagespeedSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Gem API-nøgle
              </button>
            </div>
          )}
        </ProviderRow>
      </div>
    </section>
  );
}

function ProviderRow({
  icon: Icon,
  name,
  description,
  connected,
  updatedAt,
  children,
}: {
  icon: typeof Search;
  name: string;
  description: string;
  connected: boolean;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-5 px-4 py-5 sm:px-5 xl:grid-cols-[minmax(260px,.75fr)_minmax(0,1.25fr)]">
      <div>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f4f8] text-[#546a82]">
            <Icon className="size-4.5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{name}</h3>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", connected ? "bg-[#24a56f]" : "bg-[#a8b2be]")} />
              <span className={cn("text-[11px] font-semibold", connected ? "text-[#16895f]" : "text-muted-foreground")}>
                {connected ? "Forbundet" : "Ikke konfigureret"}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
        {connected && updatedAt ? (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Senest opdateret {new Date(updatedAt).toLocaleDateString("da-DK")}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function RemoveButton({loading, onClick}: {loading: boolean; onClick: () => void}) {
  return (
    <button type="button" onClick={onClick} disabled={loading} className={dangerButtonClass}>
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      Fjern forbindelse
    </button>
  );
}

function Feedback({tone, children}: {tone: "error" | "success"; children: React.ReactNode}) {
  return (
    <p className={cn("mt-2 flex items-center gap-1.5 text-xs", tone === "success" ? "text-[#16895f]" : "text-[#c83d3d]")}>
      {tone === "success" ? <CheckCircle2 className="size-3.5" /> : null}
      {children}
    </p>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[#9ec7e5] focus:ring-2 focus:ring-[#3aa9e8]/15";
const primaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#172331] px-3.5 text-xs font-semibold text-white transition hover:bg-[#223449] disabled:pointer-events-none disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3.5 text-xs font-semibold text-foreground transition hover:bg-[#f7f9fb] disabled:pointer-events-none disabled:opacity-50";
const dangerButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#efcaca] bg-white px-3.5 text-xs font-semibold text-[#c83d3d] transition hover:bg-[#fff4f4] disabled:pointer-events-none disabled:opacity-50";
