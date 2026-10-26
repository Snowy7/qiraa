import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@template/ui";
import { EmptyState } from "@/components/page";
import { useI18n } from "@/lib/i18n";

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <EmptyState
      className="min-h-[70dvh] justify-center"
      icon={<Compass />}
      title={t("notFound")}
      hint={t("notFoundHint")}
      action={
        <Button asChild>
          <Link to="/">{t("goHome")}</Link>
        </Button>
      }
    />
  );
}
