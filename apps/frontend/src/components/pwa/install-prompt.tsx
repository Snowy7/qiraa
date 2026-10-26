import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@template/ui";
import { NoorMark } from "@/components/icons";
import { useI18n } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "noor-install-dismissed";

const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * A one-time, dismissible install suggestion: the native prompt where the
 * browser offers one, and Add-to-Home-Screen instructions on iOS.
 */
export function InstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // iOS has no install event; suggest it after the user has settled in.
    const timer = isIos()
      ? setTimeout(() => setVisible(true), 30_000)
      : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 mx-auto max-w-md animate-in fade-in slide-in-from-top-4 md:bottom-6 md:end-6 md:start-auto md:top-auto md:mx-0">
      <div className="flex items-start gap-3 rounded-3xl border border-border/70 bg-popover p-4 shadow-float">
        <NoorMark className="size-10 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("install")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {deferred ? t("installHint") : t("installIosHint")}
          </p>
          {deferred && (
            <Button
              size="sm"
              className="mt-3"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                dismiss();
              }}
            >
              <Download /> {t("install")}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="-me-1 -mt-1"
          onClick={dismiss}
          aria-label={t("notNow")}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
