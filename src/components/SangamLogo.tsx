interface SangamLogoProps {
  size?: number;
  className?: string;
}

/**
 * Sangam logo — three curved streams/ribbons intertwining to form
 * an abstract "S" letter, in teal-to-coral gradient.
 */
export default function SangamLogo({ size = 36, className = '' }: SangamLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sangam-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5A4" />
          <stop offset="0.5" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#FF6B4A" />
        </linearGradient>
        <linearGradient id="sangam-grad-2" x1="48" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B4A" />
          <stop offset="0.5" stopColor="#FB923C" />
          <stop offset="1" stopColor="#0EA5A4" />
        </linearGradient>
      </defs>
      {/* Ribbon 1 — top curve */}
      <path
        d="M8 12C8 12 16 6 24 10C32 14 40 8 40 8"
        stroke="url(#sangam-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ribbon 2 — middle S curve */}
      <path
        d="M10 24C10 24 18 18 24 24C30 30 38 24 38 24"
        stroke="url(#sangam-grad-2)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ribbon 3 — bottom curve */}
      <path
        d="M8 36C8 36 16 30 24 34C32 38 40 32 40 32"
        stroke="url(#sangam-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Intersection dots for the "knot" feel */}
      <circle cx="24" cy="24" r="2.5" fill="#FF6B4A" />
      <circle cx="24" cy="14" r="1.5" fill="#0EA5A4" opacity="0.7" />
      <circle cx="24" cy="34" r="1.5" fill="#FF6B4A" opacity="0.7" />
    </svg>
  );
}
