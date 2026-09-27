import { cn } from "@/lib/utils";
import { HeaderStatus } from "@/components/ui/header-status";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 sm:mb-6", className)}>
      <HeaderStatus>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.035em] text-foreground sm:text-[32px]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">
              {actions}
            </div>
          ) : null}
        </div>
      </HeaderStatus>
    </div>
  );
}
