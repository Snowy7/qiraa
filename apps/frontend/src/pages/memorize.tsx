import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Brain, CalendarCheck, Flame, Play } from "lucide-react";
import { Button } from "@template/ui";
import { Page, PageHeader } from "@/components/page";
import { getHifzSummary } from "@/lib/db/hifz";
import { useI18n } from "@/lib/i18n";

export default function MemorizePage() {
  const { t, n } = useI18n();
  const summary = useLiveQuery(getHifzSummary, []);
  const started = summary && summary.memorized + summary.learning > 0;
  const percent = summary ? (summary.memorized / summary.total) * 100 : 0;

  const stats = summary && [
    { icon: <Flame />, value: summary.streak, label: t("dayStreak") },
    {
      icon: <CalendarCheck />,
      value: summary.reviewedToday,
      label: t("reviewedToday"),
    },
    { icon: <Brain />, value: summary.learning, label: t("learning") },
  ];

  return (
    <>
      <PageHeader title={t("memorization")} />
      <Page className="space-y-5">
        <section className="hero-glow surface grid gap-6 p-6 md:grid-cols-[auto,1fr] md:items-center md:p-8">
          <div className="relative mx-auto size-40">
            <svg viewBox="0 0 36 36" className="size-40 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="2.6"
                className="stroke-foreground/10"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="2.6"
                strokeLinecap="round"
                className="stroke-primary transition-[stroke-dasharray] duration-700"
                strokeOpacity={percent > 0 ? 1 : 0}
                strokeDasharray={`${percent * 0.974} 97.4`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">
                {n(Math.round(percent * 10) / 10)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {t("memorized")}
              </span>
            </div>
          </div>
          <div className="text-center md:text-start">
            <p className="text-xl font-bold">
              {summary
                ? t("memorizedOf", {
                    n: summary.memorized,
                    total: summary.total,
                  })
                : " "}
            </p>
            {summary && summary.due > 0 ? (
              <>
                <p className="mt-1 text-muted-foreground">
                  {t("dueCount", { n: summary.due })}
                </p>
                <Button asChild size="lg" className="mt-5">
                  <Link to="/memorize/review">
                    <Play className="fill-current" /> {t("startReview")}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mt-1 text-muted-foreground">
                  {started ? t("allCaughtUpHint") : t("startMemorizingHint")}
                </p>
                {!started && (
                  <Button asChild variant="outline" className="mt-5">
                    <Link to="/quran">{t("quran")}</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </section>

        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="surface flex flex-col items-center gap-1 p-4 text-center md:p-6"
              >
                <span className="text-primary [&_svg]:size-5">{stat.icon}</span>
                <span className="text-2xl font-bold tabular-nums">
                  {n(stat.value)}
                </span>
                <span className="text-xs text-muted-foreground md:text-sm">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </Page>
    </>
  );
}
