import { splitSentences, splitWords } from "@/lib/sentences";
import { READING_STYLE } from "@/lib/site";

// Nhịp hiện chữ: mỗi câu cách nhau SENTENCE_STEP giây.
const SENTENCE_STEP = 0.4;

/**
 * Lớp CSS của một chữ khi đang nghe giọng đọc.
 * `active` là thứ tự chữ đang được đọc: null là không nghe, -1 là đang nghe nhưng chưa đọc tới chữ nào.
 */
function wordClass(index: number, active: number | null | undefined): string {
  if (active === null || active === undefined) return "word";
  if (READING_STYLE === "box") return index === active ? "word reading" : "word";
  // Mực hiện dần: chữ đã đọc thì đậm, chữ chưa đọc thì nhạt
  return index <= active ? "word" : "word word--unread";
}

/**
 * Tờ giấy của một lá thư.
 * - `revealDelay` (giây): chữ hiện dần từng câu, bắt đầu sau khoảng trễ đó. Bỏ trống thì hiện ngay.
 * - `still`: tờ giấy đứng yên từ đầu, không tự mờ dần hiện ra (dùng khi có bìa sách che phía trên).
 * - `activeWord`: thứ tự chữ đang được giọng đọc đọc tới. null là không nghe, -1 là đang nghe
 *   nhưng chưa tới chữ đầu tiên. Bỏ trống hẳn nếu lá thư không có giọng đọc.
 */
export function LetterPaper({
  eyebrow,
  title,
  text,
  signature,
  page,
  revealDelay,
  still = false,
  activeWord,
  hasPrevious = false,
  hasNext = false,
  className = "",
  onAnimationEnd,
}: {
  eyebrow: string;
  title: string;
  text: string;
  signature?: string;
  page?: number;
  revealDelay?: number;
  still?: boolean;
  activeWord?: number | null;
  hasPrevious?: boolean; // có trang trước để lật về: hiện mũi tên nhỏ ở góc dưới trái
  hasNext?: boolean; // có trang sau để lật tới: hiện mũi tên nhỏ cạnh số trang
  className?: string;
  onAnimationEnd?: () => void;
}) {
  const reveal = revealDelay !== undefined;
  const karaoke = activeWord !== undefined;
  // Chỉ tách câu và chữ khi cần: để hiện dần từng câu, hoặc để tô sáng từng chữ theo giọng đọc.
  const sentences = reveal || karaoke ? splitSentences(text) : null;
  const signatureDelay = (revealDelay ?? 0) + 0.35 + (sentences?.length ?? 0) * SENTENCE_STEP;
  let wordIndex = 0;

  return (
    <article
      className={`flex flex-col rounded-2xl bg-paper px-6 py-7 text-ink shadow-xl shadow-black/25 ${still ? "" : "letter-in"} ${className}`}
      style={reveal && !still ? { animationDelay: `${revealDelay}s` } : undefined}
      onAnimationEnd={
        onAnimationEnd
          ? (event) => {
              if (event.target === event.currentTarget) onAnimationEnd();
            }
          : undefined
      }
    >
      <h1 className="text-[22px] font-bold leading-tight">{title}</h1>
      <div aria-hidden="true" className="mt-1 h-0.5 w-12 rounded-full bg-deep/60" />
      <p className="mt-3 whitespace-pre-line font-serif text-[18px] leading-[1.75]">
        {sentences
          ? sentences.map((sentence, i) => (
              <span
                key={i}
                className={reveal ? "sentence" : undefined}
                style={
                  reveal
                    ? { animationDelay: `${(revealDelay ?? 0) + 0.35 + i * SENTENCE_STEP}s` }
                    : undefined
                }
              >
                {karaoke
                  ? splitWords(sentence).map((word) => {
                      const index = wordIndex++;
                      return (
                        <span key={index}>
                          <span className={wordClass(index, activeWord)}>{word}</span>{" "}
                        </span>
                      );
                    })
                  : `${sentence} `}
              </span>
            ))
          : text}
      </p>
      {signature ? (
        <p
          className={`mt-6 text-right font-serif text-[16px] italic text-deep ${reveal ? "sentence" : ""}`}
          style={reveal ? { animationDelay: `${signatureDelay}s` } : undefined}
        >
          {signature}
        </p>
      ) : null}
      {page !== undefined ? (
        // Số trang ở góc dưới bên phải, như sách in. Mũi tên nhỏ báo còn trang để lật.
        <p className="-mb-3 mt-auto flex justify-between pt-8 font-serif text-[14px] text-deep/80">
          <span>{hasPrevious ? "‹" : ""}</span>
          <span>
            {page}
            {hasNext ? " ›" : ""}
          </span>
        </p>
      ) : null}
    </article>
  );
}
