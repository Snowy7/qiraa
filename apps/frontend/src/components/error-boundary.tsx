import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@template/ui";
import { formatMessage } from "@noor/core";
import { NoorMark } from "@/components/icons";
import { usePreferences } from "@/lib/stores/preferences";

/** Route-level error screen. Avoids hooks that might themselves have failed. */
export function RouteError() {
  const error = useRouteError();
  const locale = usePreferences.getState().language;
  const t = (key: Parameters<typeof formatMessage>[0]) =>
    formatMessage(key, locale);
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (!notFound) console.error(error);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <NoorMark className="size-14 text-primary" />
      <h1 className="text-2xl font-bold">
        {t(notFound ? "notFound" : "somethingWrong")}
      </h1>
      {notFound && (
        <p className="max-w-sm text-muted-foreground">{t("notFoundHint")}</p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          {t("goHome")}
        </Button>
        {!notFound && (
          <Button onClick={() => window.location.reload()}>
            <RefreshCw /> {t("reload")}
          </Button>
        )}
      </div>
    </div>
  );
}
