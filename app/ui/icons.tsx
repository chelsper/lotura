export type IconProps = {
  className?: string;
};

const shared = {
  "aria-hidden": true,
  fill: "none",
  viewBox: "0 0 24 24",
} as const;

export function ArrowIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ChevronIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ExceptionIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="M12 3.75 21 19.5H3L12 3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M12 9v4.5m0 2.75v.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ExplorerIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="M5 4.75h14v14.5H5zM5 9.5h14M9.5 9.5v9.75"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M7.25 7.1h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function FlowIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="6" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.25 6h7.5M7.4 7.8l3.45 8.15m5.75-8.15-3.45 8.15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function HomeIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="m4 10 8-6.25L20 10v9.25h-5.25V14h-5.5v5.25H4V10Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function LayersIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="m12 4 8.25 4.25L12 12.5 3.75 8.25 12 4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="m4 12.25 8 4.1 8-4.1M4 16.25l8 4.1 8-4.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function OrganizationIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect
        height="5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.6"
        width="8"
        x="8"
        y="3.5"
      />
      <rect
        height="5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.6"
        width="7"
        x="3.5"
        y="15.5"
      />
      <rect
        height="5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.6"
        width="7"
        x="13.5"
        y="15.5"
      />
      <path
        d="M12 8.5v3.5m-5 0h10M7 12v3.5m10-3.5v3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function RoleIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.5 19.25c.55-3.15 3.05-5.25 6.5-5.25s5.95 2.1 6.5 5.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function SearchIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="m20.5 20.5-4.2-4.2m2.2-5.8a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function SystemIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect
        height="11.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
        width="16.5"
        x="3.75"
        y="5"
      />
      <path
        d="M8.5 20h7M12 16.5V20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function CheckIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="m5 12.5 4.25 4.25L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function InfoIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 10.5v5m0-8v.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
