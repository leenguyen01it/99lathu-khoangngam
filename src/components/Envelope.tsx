/**
 * Phong thư có dấu niêm vàng.
 * - "opening": nắp lật lên, tờ thư trượt ra (dùng khi vào trang xem thư)
 * - "waiting": đứng yên, dấu niêm nhịp nhẹ (dùng cho màn hình chờ)
 */
export function Envelope({ mode }: { mode: "opening" | "waiting" }) {
  return (
    <div className={`envelope envelope--${mode}`} aria-hidden>
      <div className="envelope__back" />
      <div className="envelope__sheet" />
      <div className="envelope__front" />
      <div className="envelope__flap" />
      <div className="envelope__seal" />
    </div>
  );
}
