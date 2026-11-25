import { FOCUSABLE_SELECTOR } from "@/constants";

const NOT_IN_TAB_ORDER = "-1";
const HIDDEN_OR_INERT = "[hidden], [inert]";

/**
 * Los elementos de `container` que se alcanzan con Tab, en el orden del documento (SCRUM-142, regla 6).
 * Solo mira atributos y el DOM, nunca el layout: jsdom no lo calcula y los tests tienen que dar lo mismo
 * que el navegador. `:disabled` también cubre los controles dentro de un `fieldset` deshabilitado.
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getAttribute("tabindex") !== NOT_IN_TAB_ORDER &&
      !element.matches(":disabled") &&
      element.closest(HIDDEN_OR_INERT) === null,
  );
