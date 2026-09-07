// Lightweight, instant spam detection — no API call, so it doesn't
// slow down form submission. Catches the obvious cases: repeated
// gibberish ("HAHAHAHA", "BLAH BLAH BLAH") and emoji-only messages.

export function isLikelySpam(message: string): boolean {
  const trimmed = message.trim();

  if (trimmed.length === 0) return true;

  // Case 1: message has no real letters at all (only emojis/symbols/numbers)
  const hasLetters = /[a-zA-Z]/.test(trimmed);
  if (!hasLetters) return true;

  // Case 2: a short chunk (1-4 chars) repeated 4+ times in a row,
  // e.g. "HAHAHAHAHA", "lolololol", "BLAHBLAHBLAHBLAH"
  const repeatedChunkPattern = /(.{1,4})\1{3,}/i;
  if (repeatedChunkPattern.test(trimmed.replace(/\s+/g, ""))) return true;

  // Case 3: same word repeated many times with spaces,
  // e.g. "blah blah blah blah blah"
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    const uniqueWords = new Set(words);
    const uniqueRatio = uniqueWords.size / words.length;
    if (uniqueRatio < 0.35) return true;
  }

  // Case 4: extremely low character diversity (e.g. "aaaaaaaaaaaaaaaa")
  const lettersOnly = trimmed.toLowerCase().replace(/[^a-z]/g, "");
  if (lettersOnly.length >= 8) {
    const uniqueChars = new Set(lettersOnly.split(""));
    if (uniqueChars.size <= 2) return true;
  }

  return false;
}