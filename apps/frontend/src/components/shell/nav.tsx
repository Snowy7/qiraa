import type { ComponentType, SVGProps } from "react";
import { NavLink } from "react-router-dom";
import { Bookmark, Brain, House, Search, Settings } from "lucide-react";
import type { MessageKey } from "@noor/core";
import { MosqueIcon, NoorMark, QuranIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: MessageKey;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Also active on these path prefixes (e.g. the reader belongs to Quran). */
  match?: string[];
}

const PRIMARY: NavItem[] = [
  { to: "/", label: "home", icon: House },
  { to: "/quran", label: "quran", icon: QuranIcon, match: ["/mushaf"] },
  { to: "/saved", label: "saved", icon: Bookmark },
  { to: "/memorize", label: "memorize", icon: Brain },
  { to: "/prayer", label: "prayer", icon: MosqueIcon },
];

const SECONDARY: NavItem[] = [
  { to: "/search", label: "search", icon: Search },
  { to: "/settings", label: "settings", icon: Settings },
];

function isActive(item: NavItem, pathname: string) {
  if (item.to === "/") return pathname === "/";
  return [item.to, ...(item.match ?? [])].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Tablet and desktop navigation. An icon rail from `md`, a labelled sidebar
 * from `xl`. `compact` keeps the rail on wide screens (reader focus mode).
 */
export function Sidebar({
  pathname,
  compact,
}: {
  pathname: string;
  compact: boolean;
}) {
  const { t } = useI18n();
  const wide = !compact;

  const renderItem = (item: NavItem) => {
    const active = isActive(item, pathname);
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground",
          wide && "xl:flex-row xl:gap-3 xl:px-3 xl:py-2.5 xl:text-[15px]",
          active && "text-foreground",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-14 items-center justify-center rounded-full transition-colors group-hover:bg-secondary",
            wide &&
              "xl:h-auto xl:w-auto xl:bg-transparent xl:group-hover:bg-transparent",
            active && "bg-secondary text-primary",
          )}
        >
          <Icon className="size-[22px]" strokeWidth={active ? 2.1 : 1.8} />
        </span>
        <span className={cn(wide && "xl:flex-1")}>{t(item.label)}</span>
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh w-[88px] shrink-0 flex-col border-e border-border/60 bg-background/60 px-2 pb-5 pt-safe md:flex",
        wide && "xl:w-64 xl:px-4",
      )}
    >
      <NavLink
        to="/"
        className={cn(
          "mb-4 mt-5 flex items-center justify-center gap-2.5 text-primary",
          wide && "xl:justify-start xl:px-3",
        )}
      >
        <NoorMark className="size-9" />
        <span
          className={cn(
            "hidden text-xl font-bold tracking-tight text-foreground",
            wide && "xl:inline",
          )}
        >
          {t("appName")}
        </span>
      </NavLink>
      <nav className={cn("flex flex-col gap-1", wide && "xl:gap-0.5")}>
        {PRIMARY.map(renderItem)}
      </nav>
      <nav className={cn("mt-auto flex flex-col gap-1", wide && "xl:gap-0.5")}>
        {SECONDARY.map(renderItem)}
      </nav>
    </aside>
  );
}

/** Phone navigation: a floating tab bar above the home indicator. */
export function TabBar({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md md:hidden">
      <div className="grid grid-cols-5 rounded-[28px] border border-border/70 bg-card/85 p-1.5 shadow-float backdrop-blur-xl">
        {PRIMARY.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-[22px] py-2 text-[10.5px] font-semibold text-muted-foreground transition-colors active:scale-95",
                active && "bg-secondary text-primary",
              )}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.1 : 1.8} />
              {t(item.label)}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
