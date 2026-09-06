/**
 * Subtle Journal Echoes & Micro-Messages
 *
 * A restrained, philosophical pool of reflective aphorisms and gentle easter eggs.
 * Designed to appear unobtrusively in empty states, saved indicators, and vault footers.
 * Never gamified, never distracting—like marginalia in an antique notebook.
 */

export interface JournalEcho {
  text: string;
  isRare?: boolean;
}

// Gentle everyday reflections (80% probability)
export const COMMON_ECHOES: string[] = [
  'Ink dries, thoughts settle.',
  'Words give shape to what was only a feeling.',
  'A quiet record of an unrepeatable day.',
  'Memory is a garden, tended one reflection at a time.',
  'Written in stillness, remembered in clarity.',
  'Every entry is a letter to your future self.',
  'Thoughts placed on paper cannot wander into worry.',
  'The quietest hours hold the clearest light.',
  'Preserving the ordinary before it becomes extraordinary.',
  'We do not write to be understood by the world, but to understand.',
];

// Unobtrusive contemplative reflections (15% probability)
export const CONTEMPLATIVE_ECHOES: string[] = [
  'The pen moves slower than thought, and that is its greatest gift.',
  'What was heavy when felt becomes light when written.',
  'Between the words, there is room to breathe.',
  'Time softens what memory holds with care.',
  'A single sentence can anchor a whole season.',
];

// Genuinely rare easter eggs (~5% probability)
export const RARE_EASTER_EGGS: string[] = [
  'A leaf fell softly outside the vault window.',
  'Some thoughts take three seasons to understand.',
  'The nightingale sings only when the orchard is quiet.',
  'You wrote between the lines today.',
  'Somewhere in these pages, a forgotten afternoon is waiting to be found again.',
];

export const DEFAULT_FALLBACK_ECHO: JournalEcho = {
  text: 'Between the words, there is room to breathe.',
  isRare: false,
};

export const NORMAL_ECHOES: string[] = [
  ...COMMON_ECHOES,
  ...CONTEMPLATIVE_ECHOES,
];

/**
 * Returns an echo with weighted probability:
 * ~5% rare easter egg
 * ~15% contemplative
 * ~80% common serene
 * Deterministic fallback ensures UI never appears empty.
 */
export function getRandomEcho(seed?: string | number): JournalEcho {
  try {
    const rand = Math.random();

    if (rand < 0.05 && RARE_EASTER_EGGS.length > 0) {
      const idx = Math.floor(Math.random() * RARE_EASTER_EGGS.length);
      return { text: RARE_EASTER_EGGS[idx] || DEFAULT_FALLBACK_ECHO.text, isRare: true };
    }

    if (rand < 0.20 && CONTEMPLATIVE_ECHOES.length > 0) {
      const idx = Math.floor(Math.random() * CONTEMPLATIVE_ECHOES.length);
      return { text: CONTEMPLATIVE_ECHOES[idx] || DEFAULT_FALLBACK_ECHO.text, isRare: false };
    }

    const pool = COMMON_ECHOES.length > 0 ? COMMON_ECHOES : NORMAL_ECHOES;
    const idx = Math.floor(Math.random() * pool.length);
    return { text: pool[idx] || DEFAULT_FALLBACK_ECHO.text, isRare: false };
  } catch {
    return DEFAULT_FALLBACK_ECHO;
  }
}

/**
 * Naturally rotates to another echo from the pool, avoiding repeating the current text.
 * Maintains ~5% rare easter egg probability and guarantees deterministic fallback.
 */
export function getNextEcho(currentText?: string): JournalEcho {
  try {
    if (Math.random() < 0.05 && RARE_EASTER_EGGS.length > 0) {
      const availableRare = RARE_EASTER_EGGS.filter((t) => t !== currentText);
      const pool = availableRare.length > 0 ? availableRare : RARE_EASTER_EGGS;
      const idx = Math.floor(Math.random() * pool.length);
      return { text: pool[idx] || DEFAULT_FALLBACK_ECHO.text, isRare: true };
    }

    const availableNormal = NORMAL_ECHOES.filter((t) => t !== currentText);
    const pool = availableNormal.length > 0 ? availableNormal : NORMAL_ECHOES;
    const idx = Math.floor(Math.random() * pool.length);
    return { text: pool[idx] || DEFAULT_FALLBACK_ECHO.text, isRare: false };
  } catch {
    return DEFAULT_FALLBACK_ECHO;
  }
}

/**
 * Deterministically retrieves an echo for a given date or ID
 */
export function getDailyEcho(dateString: string): JournalEcho {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash << 5) - hash + dateString.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  // 5% chance of rare based on hash
  if (absHash % 20 === 0) {
    const idx = absHash % RARE_EASTER_EGGS.length;
    return { text: RARE_EASTER_EGGS[idx], isRare: true };
  }

  const all = [...COMMON_ECHOES, ...CONTEMPLATIVE_ECHOES];
  const idx = absHash % all.length;
  return { text: all[idx], isRare: false };
}
