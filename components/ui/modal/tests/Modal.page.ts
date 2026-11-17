import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Page Object del Modal compartido (SCRUM-142): abre, recorre con el teclado y cierra como lo haría una persona.
export const createModalPage = () => {
  const user = userEvent.setup();

  const getDialog = (): HTMLElement => screen.getByRole("dialog");
  const getButton = (name: string): HTMLElement => screen.getByRole("button", { name });
  // El fondo no tiene rol: es el contenedor del diálogo, el que cierra con un clic.
  const getOverlay = (): HTMLElement => getDialog().parentElement as HTMLElement;

  return {
    clickButton: (name: string): Promise<void> => user.click(getButton(name)),
    clickInsideDialog: (): Promise<void> => user.click(getDialog()),
    clickOverlay: (): Promise<void> => user.click(getOverlay()),
    getButton,
    getDialog,
    getFocusedElement: (): Element | null => document.activeElement,
    getHeading: (name: string): HTMLElement => screen.getByRole("heading", { name }),
    // Disparan un mousedown y dicen si el Modal lo canceló (D3: el clic en el fondo no saca el foco).
    // fireEvent devuelve false cuando el evento se cancela.
    isDialogMouseDownCancelled: (): boolean => !fireEvent.mouseDown(getDialog()),
    isOverlayMouseDownCancelled: (): boolean => !fireEvent.mouseDown(getOverlay()),
    pressEscape: (): Promise<void> => user.keyboard("{Escape}"),
    // Tab sin las esperas de user-event, para usar con timers falsos.
    pressTabWithFakeTimers: (): void => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab" });
    },
    pressShiftTab: (): Promise<void> => user.tab({ shift: true }),
    pressTab: (): Promise<void> => user.tab(),
    queryDialog: (): HTMLElement | null => screen.queryByRole("dialog"),
  };
};
