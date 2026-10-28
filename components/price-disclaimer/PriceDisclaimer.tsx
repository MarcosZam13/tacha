import { PRICE_DISCLAIMER_TEXT } from "@/constants";

/**
 * Aviso de precios estimados (SCRUM-75 / HU-43; `price-disclaimer-banner` de
 * DESIGN.md). Va una sola vez por pantalla o sección, después del contenido
 * con precios; nunca dentro de cada tarjeta.
 *
 * Discreto (CA-02): en el flujo normal de la página, sin colores ni íconos de
 * alerta y sin forma de cerrarlo. Es un <aside> con nombre accesible: el
 * lector de pantalla lo encuentra, pero no lo anuncia como alerta (sin
 * role="alert" ni role="status"). Sin props, estado ni hooks: sirve igual en
 * componentes de cliente y de servidor.
 */
export const PriceDisclaimer = (): React.JSX.Element => (
  <aside
    aria-label={PRICE_DISCLAIMER_TEXT.TITLE}
    className="flex flex-col gap-1 rounded-tacha-card border border-tacha-border bg-tacha-surface px-4 py-3"
  >
    <p className="font-body text-sm font-semibold text-tacha-text">{PRICE_DISCLAIMER_TEXT.TITLE}</p>
    <p className="font-body text-xs text-tacha-textsec">{PRICE_DISCLAIMER_TEXT.BODY}</p>
  </aside>
);
