import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import type { ShoppingModeBarProps } from "./models/ShoppingModeBarProps.interface";

/**
 * La barra del modo compra (HU-36f): dónde se está comprando, "Terminar
 * compra" (abre el panel de cierre) y "Salir" (vuelve a la lista normal sin
 * cerrar la compra, CA-06). El resto de la pantalla es la misma lista (CA-02).
 */
export const ShoppingModeBar = ({ onExit, onFinish, storeName }: ShoppingModeBarProps): React.JSX.Element => (
  <section
    aria-label={PURCHASE_SESSION_TEXT.BAR_LABEL}
    className="flex flex-wrap items-center justify-between gap-3 rounded-tacha-badge border border-tacha-teal bg-tacha-chipbg px-4 py-3"
  >
    <p className="font-body text-sm text-tacha-text">
      {PURCHASE_SESSION_TEXT.SHOPPING_AT} <span className="font-semibold">{storeName}</span>
    </p>
    <div className="flex gap-2">
      <Button variant={BUTTON_VARIANT.PRIMARY} onClick={onFinish}>
        {PURCHASE_SESSION_TEXT.FINISH}
      </Button>
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onExit}>
        {PURCHASE_SESSION_TEXT.EXIT}
      </Button>
    </div>
  </section>
);
