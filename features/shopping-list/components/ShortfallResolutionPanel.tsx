import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { SHORTFALL_PANEL_TEXT } from "../constants/shortfall-resolution.constants";
import type { ShortfallResolutionPanelProps } from "./models/ShortfallResolutionPanelProps.interface";
import { ShortfallPresentationList } from "./ShortfallPresentationList";

/**
 * "¿Qué hiciste?" (HU-77): se abre al tachar una fila con aviso de faltante.
 * Muestra la fila y sus avisos, y tres opciones de un toque (CA-02); todo
 * pasa en este mismo panel (CA-04). Si después de elegir todavía falta, sigue
 * abierto con "Todavía falta:" (regla 39), en una región aria-live para que
 * el lector anuncie el cambio. Solo presentación: qué hace cada opción lo
 * decide useShortfallResolution.
 */
export const ShortfallResolutionPanel = ({ panel }: ShortfallResolutionPanelProps): React.JSX.Element => (
  <Modal isOpen={panel.isOpen} onClose={panel.onClose} title={SHORTFALL_PANEL_TEXT.TITLE}>
    <div className="flex flex-col gap-4">
      <p className="font-body text-base font-semibold text-tacha-text">{panel.productLabel}</p>
      <div aria-live="polite" className="flex flex-col gap-1">
        {panel.isStillShort ? (
          <p className="font-body text-sm font-semibold text-tacha-terracotta">{SHORTFALL_PANEL_TEXT.STILL_SHORT}</p>
        ) : null}
        <ul className="font-body text-sm text-tacha-textsec">
          {panel.notes.map((note, position) => (
            <li key={`${position}-${note}`}>{note}</li>
          ))}
        </ul>
      </div>
      {panel.errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {panel.errorMessage}
        </p>
      ) : null}
      {panel.isViewingPresentations ? (
        <ShortfallPresentationList panel={panel} />
      ) : (
        <div className="flex flex-col gap-2">
          <Button isDisabled={panel.isBusy} onClick={panel.onSameAgain}>
            {panel.isBusy ? SHORTFALL_PANEL_TEXT.SAVING : SHORTFALL_PANEL_TEXT.SAME_AGAIN}
          </Button>
          <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={panel.isBusy} onClick={panel.onOtherPresentation}>
            {SHORTFALL_PANEL_TEXT.OTHER_PRESENTATION}
          </Button>
          <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={panel.isBusy} onClick={panel.onHadEnough}>
            {SHORTFALL_PANEL_TEXT.HAD_ENOUGH}
          </Button>
          <button
            type="button"
            disabled={panel.isBusy}
            onClick={panel.onClose}
            className="self-center font-body text-sm text-tacha-textsec underline disabled:opacity-50"
          >
            {SHORTFALL_PANEL_TEXT.NOT_NOW}
          </button>
        </div>
      )}
    </div>
  </Modal>
);
