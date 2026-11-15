// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MODAL_FOCUS_RETURN_DELAY_MS } from "@/constants";
import { Modal } from "../Modal";
import { createModalPage } from "./Modal.page";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Deja correr la vuelta de D3, que se agenda para la próxima tarea. */
const waitForFocusReturn = (): Promise<void> =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, MODAL_FOCUS_RETURN_DELAY_MS)));

const OPEN = "Abrir";
const OPEN_OTHER = "Abrir otro";
const BACKGROUND = "Fondo";
// La pantalla de prueba enfoca este botón por su cuenta, sin pasar por la interfaz.
const BACKGROUND_ID = "background";
const CANCEL = "Cancelar";
const CONFIRM = "Confirmar";
const SAVE = "Guardar";
const RETRY = "Reintentar";
const TITLE = "Confirmar acción";
const SECTION_TITLE = "Integrantes";

interface HarnessProps {
  children?: React.ReactNode;
  isCloseAccepted?: boolean;
  isModalShown?: boolean;
  isOpenerShown?: boolean;
  onClose?: () => void;
  title?: string;
}

/** Una pantalla mínima: el Modal es controlado, así que el arnés guarda isOpen como lo haría una feature. */
const Harness = ({
  children = (
    <>
      <button type="button">{CANCEL}</button>
      <button type="button">{CONFIRM}</button>
    </>
  ),
  isCloseAccepted = true,
  isModalShown = true,
  isOpenerShown = true,
  onClose = vi.fn(),
  title = TITLE,
}: HarnessProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpenerShown ? (
        <button type="button" onClick={() => setIsOpen(true)}>
          {OPEN}
        </button>
      ) : null}
      <button type="button" onClick={() => setIsOpen(true)}>
        {OPEN_OTHER}
      </button>
      <button id={BACKGROUND_ID} type="button">
        {BACKGROUND}
      </button>
      {isModalShown ? (
        <Modal
          isOpen={isOpen}
          // Una función nueva en cada render, como en la mayoría de los usos (regla 5).
          onClose={() => {
            onClose();
            if (isCloseAccepted) setIsOpen(false);
          }}
          title={title}
        >
          {children}
        </Modal>
      ) : null}
    </>
  );
};

/** Como HouseholdMembersSection (SCRUM-61): enfoca su título cuando sube la clave. */
const SectionTitle = ({ focusKey }: { focusKey: number }): React.JSX.Element => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusKey > 0) titleRef.current?.focus();
  }, [focusKey]);

  return (
    <h2 ref={titleRef} tabIndex={-1}>
      {SECTION_TITLE}
    </h2>
  );
};

interface SaveHarnessProps {
  isTitleFocusedOnSave: boolean;
  /** Como Chromium al quitar el diálogo: el foco sale de él (focusout) justo antes de que se cierre. */
  isFocusLostBeforeClosing?: boolean;
}

/**
 * Una pantalla que cierra después de una acción asíncrona, como guardar o eliminar. Con
 * `isTitleFocusedOnSave`, en la misma actualización enfoca el título de la sección, como SCRUM-61.
 */
const SaveHarness = ({ isFocusLostBeforeClosing = false, isTitleFocusedOnSave }: SaveHarnessProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [titleFocusKey, setTitleFocusKey] = useState(0);

  const save = async (): Promise<void> => {
    await Promise.resolve();
    if (isFocusLostBeforeClosing && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setIsOpen(false);
    if (isTitleFocusedOnSave) setTitleFocusKey((focusKey) => focusKey + 1);
  };

  return (
    <>
      <SectionTitle focusKey={titleFocusKey} />
      <button type="button" onClick={() => setIsOpen(true)}>
        {OPEN}
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={TITLE}>
        <button type="button" onClick={() => void save()}>
          {SAVE}
        </button>
      </Modal>
    </>
  );
};

describe("Modal: focus on open (SCRUM-142, CA-01, D1)", () => {
  it("moves the focus to the first focusable element when it opens", async () => {
    render(<Harness />);
    const page = createModalPage();

    await page.clickButton(OPEN);

    expect(page.getFocusedElement()).toBe(page.getButton(CANCEL));
  });

  it("focuses the dialog itself and keeps Tab and Shift+Tab there when nothing can be focused", async () => {
    render(<Harness>{<p>Términos y condiciones.</p>}</Harness>);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.pressTab();
    await page.pressShiftTab();

    expect(page.getFocusedElement()).toBe(page.getDialog());
  });
});

describe("Modal: focus trap (SCRUM-142, CA-02)", () => {
  it("goes from the last element to the first with Tab", async () => {
    render(<Harness />);
    const page = createModalPage();
    await page.clickButton(OPEN);
    await page.pressTab();

    await page.pressTab();

    expect(page.getFocusedElement()).toBe(page.getButton(CANCEL));
  });

  it("goes from the first element to the last with Shift+Tab", async () => {
    render(<Harness />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.pressShiftTab();

    expect(page.getFocusedElement()).toBe(page.getButton(CONFIRM));
  });

  it("keeps the focus on the only focusable element", async () => {
    render(<Harness>{<button type="button">{CANCEL}</button>}</Harness>);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.pressTab();
    await page.pressShiftTab();

    expect(page.getFocusedElement()).toBe(page.getButton(CANCEL));
  });

  it("skips disabled controls, tabindex=-1 and what is hidden at both ends of the cycle", async () => {
    // Los excluidos van antes del primero y después del último: sin el filtro, los extremos cambiarían.
    render(
      <Harness>
        <button type="button" disabled>
          Guardando
        </button>
        <button type="button" tabIndex={-1}>
          Fuera del orden
        </button>
        <button type="button">{CANCEL}</button>
        <button type="button">{CONFIRM}</button>
        <div hidden>
          <button type="button">Oculto</button>
        </div>
      </Harness>,
    );
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.pressShiftTab();

    expect(page.getFocusedElement()).toBe(page.getButton(CONFIRM));
  });

  it("drops a control that disappears while it is open", async () => {
    const DialogContent = ({ hasRetry }: { hasRetry: boolean }): React.JSX.Element => (
      <>
        <button type="button">{CANCEL}</button>
        <button type="button">{CONFIRM}</button>
        {hasRetry ? <button type="button">{RETRY}</button> : null}
      </>
    );
    const { rerender } = render(<Harness>{<DialogContent hasRetry />}</Harness>);
    const page = createModalPage();
    await page.clickButton(OPEN);
    rerender(<Harness>{<DialogContent hasRetry={false} />}</Harness>);

    await page.pressShiftTab();

    // "Reintentar" ya no está: el último enfocable es "Confirmar". Una lista calculada al abrir fallaría acá.
    expect(page.getFocusedElement()).toBe(page.getButton(CONFIRM));
  });

  it("adds a control that appears while it is open", async () => {
    const DialogContent = ({ hasRetry }: { hasRetry: boolean }): React.JSX.Element => (
      <>
        <button type="button">{CANCEL}</button>
        <button type="button">{CONFIRM}</button>
        {hasRetry ? <button type="button">{RETRY}</button> : null}
      </>
    );
    const { rerender } = render(<Harness>{<DialogContent hasRetry={false} />}</Harness>);
    const page = createModalPage();
    await page.clickButton(OPEN);
    rerender(<Harness>{<DialogContent hasRetry />}</Harness>);

    await page.pressShiftTab();

    expect(page.getFocusedElement()).toBe(page.getButton(RETRY));
  });

  it("brings the focus back inside with Tab when it already left the dialog", async () => {
    render(<Harness />);
    const page = createModalPage();
    await page.clickButton(OPEN);
    // Con timers falsos la vuelta de D3 no corre: así se prueba solo el respaldo de Tab, el caso de un
    // navegador que no avisa que el foco salió.
    vi.useFakeTimers();
    act(() => page.getButton(BACKGROUND).focus());

    page.pressTabWithFakeTimers();

    expect(page.getFocusedElement()).toBe(page.getButton(CANCEL));
  });
});

describe("Modal: Escape and clicks (SCRUM-142, CA-04)", () => {
  it("stays open with the focus inside when onClose does not close it", async () => {
    const onClose = vi.fn();
    render(<Harness isCloseAccepted={false} onClose={onClose} />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.pressEscape();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(page.queryDialog()).toBeInTheDocument();
    expect(page.getDialog()).toContainElement(page.getFocusedElement() as HTMLElement);
  });

  it("does not call onClose when clicking inside the dialog", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.clickInsideDialog();

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("Modal: focus on close (SCRUM-142, CA-03, D2)", () => {
  it("returns the focus to the button that opened it when Escape closes it", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.pressEscape();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(page.getFocusedElement()).toBe(page.getButton(OPEN));
  });

  it("returns the focus to the button that opened it when a click outside closes it", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.clickOverlay();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(page.getFocusedElement()).toBe(page.getButton(OPEN));
  });

  it("does not fail nor force the focus when the button that opened it is gone", async () => {
    const { rerender } = render(<Harness />);
    const page = createModalPage();
    await page.clickButton(OPEN);
    rerender(<Harness isOpenerShown={false} />);

    await page.pressEscape();

    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(page.getFocusedElement()).toBe(document.body);
  });

  it("does not take the focus back from an element the screen focused before closing", async () => {
    render(<Harness onClose={() => document.getElementById(BACKGROUND_ID)?.focus()} />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.pressEscape();

    expect(page.getFocusedElement()).toBe(page.getButton(BACKGROUND));
  });

  it("keeps the focus where the screen moved it on purpose when closing (SCRUM-61)", async () => {
    render(<SaveHarness isTitleFocusedOnSave />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.clickButton(SAVE);

    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    expect(page.getFocusedElement()).toBe(page.getHeading(SECTION_TITLE));
  });

  it("returns the focus after the screen closes it at the end of an async action", async () => {
    render(<SaveHarness isTitleFocusedOnSave={false} />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.clickButton(SAVE);

    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    expect(page.getFocusedElement()).toBe(page.getButton(OPEN));
  });

  it("removes its listeners and returns the focus when it unmounts while open", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Harness onClose={onClose} />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    rerender(<Harness onClose={onClose} isModalShown={false} />);
    await page.pressEscape();

    expect(onClose).not.toHaveBeenCalled();
    expect(page.getFocusedElement()).toBe(page.getButton(OPEN));
  });

  it("returns the focus to the button used each time it opens", async () => {
    render(<Harness />);
    const page = createModalPage();
    await page.clickButton(OPEN);
    await page.pressEscape();
    await page.clickButton(OPEN_OTHER);

    await page.pressEscape();

    expect(page.getFocusedElement()).toBe(page.getButton(OPEN_OTHER));
  });
});

describe("Modal: focus that leaves while it is open (SCRUM-142, CA-04, D3)", () => {
  it("keeps the focus inside when a click outside does not close it", async () => {
    const onClose = vi.fn();
    render(<Harness isCloseAccepted={false} onClose={onClose} />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.clickOverlay();
    await waitForFocusReturn();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(page.queryDialog()).toBeInTheDocument();
    expect(page.getFocusedElement()).toBe(page.getButton(CANCEL));
  });

  it("cancels the mousedown on the backdrop only, not inside the dialog", async () => {
    render(<Harness />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    const isOverlayMouseDownCancelled = page.isOverlayMouseDownCancelled();
    const isDialogMouseDownCancelled = page.isDialogMouseDownCancelled();

    expect(isOverlayMouseDownCancelled).toBe(true);
    expect(isDialogMouseDownCancelled).toBe(false);
  });

  it("brings the focus straight back to the element that had it when it leaves the open dialog", async () => {
    render(<Harness />);
    const page = createModalPage();
    await page.clickButton(OPEN);
    await page.pressTab();

    act(() => page.getButton(BACKGROUND).focus());
    await waitForFocusReturn();

    // Vuelve a "Confirmar", el que tenía el foco, y no al primero.
    expect(page.getFocusedElement()).toBe(page.getButton(CONFIRM));
  });

  it("brings the focus back to the first enabled element when the focused button gets disabled", async () => {
    const DialogContent = ({ isSaving }: { isSaving: boolean }): React.JSX.Element => (
      <>
        <button type="button">{CANCEL}</button>
        <button type="button" disabled={isSaving}>
          {CONFIRM}
        </button>
      </>
    );
    const { rerender } = render(<Harness>{<DialogContent isSaving={false} />}</Harness>);
    const page = createModalPage();
    await page.clickButton(OPEN);
    await page.pressTab();

    // Chromium saca el foco del botón que se deshabilita, lo manda a body y avisa con focusout (plan,
    // duda 4). jsdom no lo hace, y blur() no actúa sobre un botón ya deshabilitado. Por eso el test hace
    // blur() y deshabilita en el mismo tramo sincrónico, antes de que corra la vuelta: deja el mismo
    // estado que Chromium.
    act(() => page.getButton(CONFIRM).blur());
    rerender(<Harness>{<DialogContent isSaving />}</Harness>);
    await waitForFocusReturn();

    expect(page.getFocusedElement()).toBe(page.getButton(CANCEL));
  });

  it("brings the focus back to the dialog when every control is disabled", async () => {
    const DialogContent = ({ isSaving }: { isSaving: boolean }): React.JSX.Element => (
      <>
        <button type="button" disabled={isSaving}>
          {CANCEL}
        </button>
        <button type="button" disabled={isSaving}>
          {CONFIRM}
        </button>
      </>
    );
    const { rerender } = render(<Harness>{<DialogContent isSaving={false} />}</Harness>);
    const page = createModalPage();
    await page.clickButton(OPEN);

    // El mismo orden que el test anterior: el foco sale y después todo queda deshabilitado.
    act(() => page.getButton(CANCEL).blur());
    rerender(<Harness>{<DialogContent isSaving />}</Harness>);
    await waitForFocusReturn();

    expect(page.getFocusedElement()).toBe(page.getDialog());
  });

  it("does not bring the focus back while closing, so SCRUM-61 keeps the section title", async () => {
    render(<SaveHarness isTitleFocusedOnSave isFocusLostBeforeClosing />);
    const page = createModalPage();
    await page.clickButton(OPEN);

    await page.clickButton(SAVE);
    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    await waitForFocusReturn();

    expect(page.getFocusedElement()).toBe(page.getHeading(SECTION_TITLE));
  });
});

describe("Modal: renders while open (SCRUM-142, regla 5)", () => {
  it("does not move the focus again when it re-renders with another onClose or title", async () => {
    const { rerender } = render(<Harness />);
    const page = createModalPage();
    await page.clickButton(OPEN);
    await page.pressTab();

    rerender(<Harness title="Otro título" onClose={vi.fn()} />);

    expect(page.getFocusedElement()).toBe(page.getButton(CONFIRM));
  });
});
