const loaded = new Set<string>();

/** Load sign fonts once; canvas draws garbage if the face isn't ready. */
export async function loadFonts(fonts: string[]): Promise<void> {
  const pending = fonts.filter((f) => !loaded.has(f));
  if (!pending.length) return;
  await Promise.allSettled(pending.map((f) => document.fonts.load(`bold 36px '${f}'`)));
  pending.forEach((f) => loaded.add(f));
}

export const ALL_SIGN_FONTS = [
  'Inter', 'Fraunces', 'Montserrat', 'Playfair Display',
  'Oswald', 'Lato', 'Dancing Script', 'Caveat',
];
