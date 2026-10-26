import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@template/ui";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const WIDTHS = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-[1400px]",
} as const;

/** Centres page content with responsive gutters. */
export function Page({
  width = "default",
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("page-x mx-auto w-full", WIDTHS[width], className)}>
      {children}
    </div>
  );
}

/**
 * Page title row. On phones it is a compact sticky bar; from `md` it becomes
 * a large in-flow heading, since the sidebar already provides navigation.
 */
export function PageHeader({
  title,
  subtitle,
  back = false,
  actions,
  width = "default",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  actions?: ReactNode;
  width?: keyof typeof WIDTHS;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/85 pt-safe backdrop-blur-xl md:static md:bg-transparent md:backdrop-blur-none">
      <Page
        width={width}
        className="flex min-h-14 items-center gap-2 md:min-h-0 md:items-end md:pb-6 md:pt-10"
      >
        {back && <BackButton className="-ms-2" />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight md:text-[2rem] md:leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 hidden text-[15px] text-muted-foreground md:block">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </Page>
    </header>
  );
}

export function BackButton({
  className,
  to,
}: {
  className?: string;
  to?: string;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() =>
        to
          ? navigate(to)
          : window.history.length > 1
            ? navigate(-1)
            : navigate("/")
      }
      aria-label={t("back")}
    >
      <ChevronLeft className="size-6 rtl:rotate-180" />
    </Button>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-secondary text-primary [&_svg]:size-7">
        {icon}
      </div>
      <p className="text-[17px] font-semibold">{title}</p>
      {hint && (
        <p className="mt-1.5 max-w-sm text-[15px] text-muted-foreground">
          {hint}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Pill segmented control (Surah / Juz / Page, Verses / Mushaf, themes...). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  size = "default",
}: {
  value: T;
  options: readonly { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <div
      role="radiogroup"
      className={cn("inline-flex rounded-full bg-secondary p-1", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-all [&_svg]:size-4",
              size === "default" ? "h-9 px-4 text-sm" : "h-8 px-3 text-[13px]",
              selected
                ? "bg-card text-foreground shadow-[0_1px_3px_hsl(26_40%_15%/0.12)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
