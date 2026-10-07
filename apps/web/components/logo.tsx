type Props = {
  className?: string;
};

/**
 * Gradient tile with a terminal caret. Deliberately a <span> with an inline
 * SVG so it can sit inside <Link>/<a> without nesting interactive elements.
 */
export function LogoMark({ className = "h-8 w-8" }: Props) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-accent via-accent-strong to-[#075985] shadow-[0_10px_30px_-10px_rgba(56,189,248,0.75)] transition-transform duration-300 group-hover:rotate-[-6deg] ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-1/2 w-1/2 text-[#03121f]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 8l4 4-4 4" />
        <path d="M12.5 16H19" />
      </svg>
    </span>
  );
}
