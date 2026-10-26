import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue } from "react-native";

/**
 * App icons: SF Symbols on iOS, Material Symbols on Android. Both name sets
 * are typed by expo-symbols, so a typo fails the typecheck.
 */
export const ICONS = {
  back: { ios: "chevron.backward", android: "arrow_back" },
  forward: { ios: "chevron.forward", android: "chevron_right" },
  close: { ios: "xmark", android: "close" },
  check: { ios: "checkmark", android: "check" },
  search: { ios: "magnifyingglass", android: "search" },
  settings: { ios: "gearshape", android: "settings" },
  textSize: { ios: "textformat.size", android: "format_size" },
  book: { ios: "book", android: "menu_book" },
  list: { ios: "list.bullet", android: "format_list_bulleted" },
  play: { ios: "play.fill", android: "play_arrow" },
  pause: { ios: "pause.fill", android: "pause" },
  speaker: { ios: "speaker.wave.2.fill", android: "volume_up" },
  next: { ios: "forward.fill", android: "skip_next" },
  previous: { ios: "backward.fill", android: "skip_previous" },
  stop: { ios: "stop.fill", android: "stop" },
  repeat: { ios: "repeat", android: "repeat" },
  repeatOne: { ios: "repeat.1", android: "repeat_one" },
  reciter: { ios: "person.wave.2", android: "record_voice_over" },
  downloaded: { ios: "checkmark.circle.fill", android: "download_done" },
  bookmark: { ios: "bookmark", android: "bookmark" },
  bookmarkFill: { ios: "bookmark.fill", android: "bookmark_added" },
  tafsir: { ios: "text.book.closed", android: "auto_stories" },
  more: { ios: "ellipsis", android: "more_horiz" },
  copy: { ios: "doc.on.doc", android: "content_copy" },
  share: { ios: "square.and.arrow.up", android: "share" },
  sparkles: { ios: "sparkles", android: "auto_awesome" },
  arrowForward: { ios: "arrow.forward", android: "arrow_forward" },
  download: { ios: "arrow.down.circle", android: "download" },
  trash: { ios: "trash", android: "delete" },
  moon: { ios: "moon", android: "dark_mode" },
  globe: { ios: "globe", android: "language" },
  info: { ios: "info.circle", android: "info" },
  plus: { ios: "plus", android: "add" },
  folder: { ios: "folder", android: "folder" },
  brain: { ios: "brain.head.profile", android: "psychology" },
  flame: { ios: "flame.fill", android: "local_fire_department" },
  calendar: { ios: "calendar.badge.checkmark", android: "event_available" },
  eye: { ios: "eye", android: "visibility" },
  location: { ios: "location.fill", android: "my_location" },
  compass: { ios: "location.north.line.fill", android: "explore" },
  bell: { ios: "bell", android: "notifications" },
  bellFill: { ios: "bell.fill", android: "notifications_active" },
  checkCircle: { ios: "checkmark.circle.fill", android: "check_circle" },
} as const satisfies Record<string, SymbolViewProps["name"]>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color: ColorValue;
}

export function Icon({ name, size = 20, color }: IconProps) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}
