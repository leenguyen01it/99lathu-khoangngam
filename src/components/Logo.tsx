/** Logo Khoảng Ngẫm: nửa mặt trời trên đường chân trời, hai gợn nước. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M14 32A18 18 0 0 1 50 32" stroke="#ecc98a" strokeWidth="2.6" />
      <path d="M5 32H59" stroke="#ecc98a" strokeWidth="2.6" />
      <path d="M17 40H47" stroke="#bcd3bd" strokeWidth="2.6" />
      <path d="M24 47H40" stroke="#bcd3bd" strokeWidth="2.6" />
    </svg>
  );
}
