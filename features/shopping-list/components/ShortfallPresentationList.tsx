import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { SHORTFALL_PANEL_TEXT } from "../constants/shortfall-resolution.constants";
import type { ShortfallResolutionPanelProps } from "./models/ShortfallResolutionPanelProps.interface";

/**
 * La vista "Cambié a otra presentación" dentro del mismo panel (CA-04): un
 * botón por presentación con su tamaño y su precio aproximado. Ninguna se
 * marca ni se preselecciona (CA-03); el orden se explica con un texto para
 * que no parezca una recomendación.
 */
export const ShortfallPresentationList = ({ panel }: ShortfallResolutionPanelProps): React.JSX.Element => (
  <div className="flex flex-col gap-3">
    <p className="font-body text-sm font-semibold text-tacha-text">{SHORTFALL_PANEL_TEXT.PRESENTATIONS_TITLE}</p>
    {panel.isLoadingPresentations ? (
      <div className="flex items-center gap-2">
        <Spinner />
        <span className="font-body text-sm text-tacha-textsec">{SHORTFALL_PANEL_TEXT.LOADING_PRESENTATIONS}</span>
      </div>
    ) : null}
    {panel.presentationsErrorMessage ? (
      <div className="flex flex-col gap-2">
        <p role="alert" className="font-body text-sm text-red-600">
          {panel.presentationsErrorMessage}
        </p>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={panel.onRetryPresentations}>
          {SHORTFALL_PANEL_TEXT.RETRY}
        </Button>
      </div>
    ) : null}
    {panel.hasNoOtherPresentations ? (
      <p className="font-body text-sm text-tacha-textsec">{SHORTFALL_PANEL_TEXT.NO_OTHER_PRESENTATIONS}</p>
    ) : null}
    {panel.presentations.length > 0 ? (
      <>
        <p className="font-body text-xs text-tacha-textsec">{SHORTFALL_PANEL_TEXT.PRESENTATIONS_ORDER}</p>
        <ul className="flex flex-col gap-2">
          {panel.presentations.map((presentation) => (
            <li key={presentation.variantId} className="flex flex-col">
              <Button
                variant={BUTTON_VARIANT.SECONDARY}
                isDisabled={panel.isBusy}
                onClick={() => panel.onPickPresentation(presentation.variantId)}
              >
                <span aria-hidden="true" className="flex items-center justify-between gap-3">
                  <span>{presentation.sizeLabel}</span>
                  <span className="font-normal text-tacha-textsec">{presentation.priceLabel}</span>
                </span>
                <span className="sr-only">{presentation.accessibleLabel}</span>
              </Button>
            </li>
          ))}
        </ul>
      </>
    ) : null}
    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={panel.isBusy} onClick={panel.onBack}>
      {SHORTFALL_PANEL_TEXT.BACK}
    </Button>
  </div>
);
