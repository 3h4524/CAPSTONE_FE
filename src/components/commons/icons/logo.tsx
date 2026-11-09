import type { IconProps } from "@/types/commons";

export const Logo = ({ width = "40px", height = "40px", ...otherProps }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="none"
    width={width}
    height={height}
    {...otherProps}
  >
    <defs>
      <linearGradient id="logo-podivo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#4F46E5" />
      </linearGradient>
      <linearGradient id="logo-podivo-glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
    </defs>

    <rect x="32" y="32" width="448" height="448" rx="112" ry="112" fill="url(#logo-podivo-gradient)" />
    <rect
      x="34"
      y="34"
      width="444"
      height="444"
      rx="110"
      ry="110"
      fill="none"
      stroke="url(#logo-podivo-glow)"
      strokeWidth="4"
    />

    <rect x="156" y="128" width="40" height="216" rx="16" fill="#FFFFFF" />

    <path
      d="M 180 128 L 280 128 C 340 128, 380 162, 380 216 C 380 270, 340 304, 280 304 L 180 304 Z"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="40"
      strokeLinejoin="round"
    />

    <path
      d="M 276 182 C 276 202, 286 216, 306 216 C 286 216, 276 230, 276 250 C 276 230, 266 216, 246 216 C 266 216, 276 202, 276 182 Z"
      fill="#FFFFFF"
    />

    <path
      d="M 226 348 L 276 376 L 366 324"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="32"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M 226 394 L 276 422 L 366 370"
      fill="none"
      stroke="#C4B5FD"
      strokeWidth="26"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
  </svg>
);
