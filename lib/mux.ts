export function getMuxThumbnail(
  playbackId: string | null,
  width = 640
): string | null {
  if (!playbackId) return null;
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=${width}`;
}
