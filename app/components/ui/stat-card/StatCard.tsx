import type { StatCardProps } from "./models/StatCardProps.interface";

/** Tarjeta compacta tipo dashboard financiero — label + valor grande (DESIGN.md §5). */
export const StatCard = ({ label, value, helperText }: StatCardProps): React.JSX.Element => (
  <div className="rounded-tacha-card border border-tacha-border bg-tacha-surface p-4">
    <p className="font-body text-xs font-medium text-tacha-textsec uppercase">{label}</p>
    <p className="font-display text-2xl font-semibold text-tacha-text">{value}</p>
    {helperText ? <p className="mt-1 font-body text-xs text-tacha-textsec">{helperText}</p> : null}
  </div>
);
