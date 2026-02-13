/**
 * Returns a valid Image source object or undefined.
 * Use to avoid "source.uri should not be an empty string" warnings when avatar/url can be empty.
 *
 * @example
 * <Image source={safeImageSource(user.avatar)} />  // only renders valid uri
 * {safeImageSource(uri) ? <Image source={{ uri }} /> : <Placeholder />}
 */
export function safeImageSource(uri: string | null | undefined): { uri: string } | undefined {
  if (uri == null || typeof uri !== "string") return undefined;
  const trimmed = uri.trim();
  return trimmed.length > 0 ? { uri: trimmed } : undefined;
}
