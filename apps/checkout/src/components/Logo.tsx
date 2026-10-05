/* The lockup, paired light/dark. CSS in @viapay/brand/tokens.css decides which
   file shows, so there is no flash and no JS.

   Minimum sizes from the kit: 96px wide for the lockups with the wordmark,
   16px for the bare coin. Clear space around it equals the coin's radius. */

type Variant = "horizontal" | "stacked" | "icon" | "compact";

const ASPECT: Record<Variant, number> = {
  horizontal: 424.27 / 100,
  stacked: 251.89 / 210,
  icon: 150 / 100,
  compact: 100 / 64,
};

const FILE: Record<Variant, string> = {
  horizontal: "viapay-horizontal",
  stacked: "viapay-stacked",
  icon: "viapay-icon",
  compact: "viapay-icon-compact",
};

export function Logo({
  variant = "horizontal",
  width,
  className = "",
  alt = "ViaPay",
}: {
  variant?: Variant;
  width: number;
  className?: string;
  /** Empty string when a nearby text node already says ViaPay. */
  alt?: string;
}) {
  const height = Math.round((width / ASPECT[variant]) * 100) / 100;
  const shared = { width, height, alt, "aria-hidden": alt === "" || undefined };
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...shared}
        src={`/brand/${FILE[variant]}-light.svg`}
        className={`via-logo via-logo--on-light ${className}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...shared}
        src={`/brand/${FILE[variant]}-dark.svg`}
        className={`via-logo via-logo--on-dark ${className}`}
      />
    </>
  );
}
