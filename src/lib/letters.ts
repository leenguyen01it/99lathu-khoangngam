import data from "../../content/letters.json";
import trialData from "../../content/trial-letters.json";

export interface Letter {
  id: string;
  theme: string;
  n: number; // thứ tự mở, 1..TOTAL
  text: string;
}

const letters: Letter[] = data.letters
  .map(({ id, theme, n, text }) => ({ id, theme, n, text }))
  .sort((a, b) => a.n - b.n);

// Phần đọc thử dùng bộ thư riêng, không trùng lá nào trong bộ chính:
// người đọc thử xong rồi mua thẻ vẫn nhận toàn lá mới, bắt đầu từ lá số 1.
const trialLetters: Letter[] = trialData.letters.slice().sort((a, b) => a.n - b.n);

export const TOTAL_LETTERS = letters.length;
export const TRIAL_LETTERS = trialLetters.length;

export function getLetter(n: number): Letter | null {
  return letters[n - 1] ?? null;
}

/** Các lá từ 1 tới n, lá mới nhất đứng đầu. */
export function lettersUpTo(n: number): Letter[] {
  return letters.slice(0, Math.max(0, n)).reverse();
}

/** Tìm một lá thư theo id, trong cả bộ chính lẫn bộ đọc thử. */
export function getLetterById(id: string): { letter: Letter; trial: boolean } | null {
  const main = letters.find((letter) => letter.id === id);
  if (main) return { letter: main, trial: false };
  const trial = trialLetters.find((letter) => letter.id === id);
  return trial ? { letter: trial, trial: true } : null;
}

/** Các lá đọc thử từ 1 tới n, lá mới nhất đứng đầu. */
export function trialLettersUpTo(n: number): Letter[] {
  return trialLetters.slice(0, Math.max(0, n)).reverse();
}
