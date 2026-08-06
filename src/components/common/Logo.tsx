import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ROUTES } from "@/constants";

export interface LogoProps {
  size?: "sm" | "md" | "lg";
  withLink?: boolean;
  className?: string;
  animated?: boolean;
}

/**
 * PMQMovies brand mark. Uses the pre-rendered PNG logo asset shipped at
 * /logo.png (transparent background, ~25KB). Adds two subtle animations
 * so the mark feels alive without being distracting:
 *   1. A very slight vertical bob (like a film reel gently turning).
 *   2. An angled "cinematic sheen" that sweeps left-to-right across the
 *      artwork every few seconds — the classic film-reel scroll feel.
 * Both can be turned off via `animated={false}` (e.g. in Loading overlays
 * where too much motion becomes noisy).
 */
export default function Logo({
  size = "md",
  withLink = true,
  className = "",
  animated = true,
}: LogoProps) {
  const heights = { sm: 48, md: 68, lg: 96 };
  const h = heights[size];

  const inner = (
    <span
      className={`relative inline-flex items-center select-none ${className}`}
      style={{ height: h }}
      aria-label="PMQMovies"
    >
      <motion.img
        src="/logo.png"
        alt="PMQMovies"
        style={{ height: h, width: "auto" }}
        draggable={false}
        {...(animated
          ? {
              animate: { y: [0, -1.5, 0, 1.5, 0] },
              transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }
          : {})}
      />

      {/* Cinematic sheen — a slim diagonal white gradient that sweeps across
          the logo, imitating light bouncing off metallic film. Sits above
          the img via absolute positioning + mix-blend-overlay so it lights
          the letters without darkening transparent pixels. */}
      {animated && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius: 6 }}
        >
          <motion.span
            className="absolute top-0 h-full"
            style={{
              width: "35%",
              background:
                "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
              mixBlendMode: "overlay",
              filter: "blur(2px)",
            }}
            animate={{ left: ["-40%", "120%"] }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              repeatDelay: 2.4,
              ease: "easeInOut",
            }}
          />
        </motion.span>
      )}
    </span>
  );

  if (!withLink) return inner;

  return (
    <Link
      to={ROUTES.HOME}
      className="flex-shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      aria-label="PMQMovies — Trang chủ"
    >
      {inner}
    </Link>
  );
}
