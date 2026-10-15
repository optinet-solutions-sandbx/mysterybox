/**
 * Product photos in web/public/reference/misty/ were taken from themistybox.com (a competitor)
 * as placeholders for INTERNAL review only — see that folder's SOURCES.md.
 * Set NEXT_PUBLIC_REFERENCE_IMAGES=off before any public preview; items then fall back to the
 * engraved drawings until licensed photography replaces them.
 */
export const referenceImagesEnabled = process.env.NEXT_PUBLIC_REFERENCE_IMAGES !== "off";

export function referenceImage(itemId: string): string | undefined {
  return referenceImagesEnabled ? `/reference/misty/${itemId}.webp` : undefined;
}
