import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

/** Registers the service worker and offers a reload when a new version is ready. */
export function ReloadPrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration)
        setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast(t("updateReady"), {
      duration: Infinity,
      action: { label: t("reload"), onClick: () => updateServiceWorker(true) },
    });
  }, [needRefresh, updateServiceWorker, t]);

  return null;
}
