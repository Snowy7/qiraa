import { ScrollView, View } from "react-native";
import { ReadingOptions } from "@/components/reader/reading-options";
import { SheetHeader } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";

/** Reading options over the open reader, so changes preview live underneath. */
export default function ReaderSettingsSheet() {
  const { t } = useI18n();
  return (
    <ScrollView contentContainerClassName="pb-12">
      <SheetHeader title={t("readingSettings")} />
      <View className="px-4 pt-2">
        <ReadingOptions />
      </View>
    </ScrollView>
  );
}
