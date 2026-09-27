import { cn } from "@/lib/utils";

type RelivaMarkProps = {
  className?: string;
  compact?: boolean;
};

export function RelivaMark({ className, compact = false }: RelivaMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg viewBox="0 0 36 36" aria-hidden="true" className="size-9 shrink-0">
        <rect x="5" y="5" width="12" height="12" rx="4" fill="#dff7f0" />
        <rect x="19" y="5" width="12" height="12" rx="4" fill="#8ee6c4" />
        <rect x="5" y="19" width="12" height="12" rx="4" fill="#f8fbff" />
        <rect x="19" y="19" width="12" height="12" rx="4" fill="#4f9fe8" />
        <path d="M17 5v12H5z" fill="#b9efe0" />
        <path d="M31 19H19v12z" fill="#78baf0" />
      </svg>

      {!compact ? (
        <div className="min-w-0 leading-none">
          <p className="text-[17px] font-semibold tracking-[-0.035em] text-white">Reliva</p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Visibility
          </p>
        </div>
      ) : null}
    </div>
  );
}
