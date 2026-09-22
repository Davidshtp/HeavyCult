export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="HeavyCult"
    >
      <rect width="64" height="64" rx="16" fill="#4f46e5" />
      <path
        d="M21 15v34M43 15v34M21 32h22"
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="54" cy="48.5" r="4.5" fill="#c4b5fd" />
    </svg>
  );
}