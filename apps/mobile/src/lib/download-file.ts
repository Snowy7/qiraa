import { File } from "expo-file-system";

/**
 * Downloads `url` to `file`, writing to a `.part` file first: Android streams
 * straight into the target, so a failed or killed download would otherwise
 * leave a truncated file that looks complete.
 */
export async function downloadFile(url: string, file: File): Promise<void> {
  const partial = new File(`${file.uri}.part`);
  await File.downloadFileAsync(url, partial, { idempotent: true });
  if (file.exists) file.delete();
  partial.move(file);
}
