// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getFocusableElements } from "../utils/getFocusableElements";

const createContainer = (html: string): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
};

const idsOf = (elements: HTMLElement[]): string[] => elements.map((element) => element.id);

describe("getFocusableElements (SCRUM-142, regla 6)", () => {
  it("returns the elements reachable with Tab in document order", () => {
    const container = createContainer(`
      <a id="link" href="/recetas">Recetas</a>
      <button id="button">Guardar</button>
      <input id="input" />
      <select id="select"><option>1</option></select>
      <textarea id="textarea"></textarea>
      <div id="tabindex" tabindex="0">Zona</div>
      <div id="editable" contenteditable="true">Notas</div>
    `);

    expect(idsOf(getFocusableElements(container))).toEqual([
      "link",
      "button",
      "input",
      "select",
      "textarea",
      "tabindex",
      "editable",
    ]);
  });

  it("skips disabled controls, tabindex=-1 and hidden inputs", () => {
    const container = createContainer(`
      <button id="disabled" disabled>Guardando</button>
      <button id="out-of-order" tabindex="-1">Fuera</button>
      <input id="hidden-input" type="hidden" />
      <fieldset disabled><input id="in-disabled-fieldset" /></fieldset>
      <a id="no-href">Sin destino</a>
      <div id="not-editable" contenteditable="false">Texto</div>
      <button id="enabled">Cancelar</button>
    `);

    expect(idsOf(getFocusableElements(container))).toEqual(["enabled"]);
  });

  it("skips what is inside [hidden] or [inert]", () => {
    const container = createContainer(`
      <div hidden><button id="in-hidden">Oculto</button></div>
      <div inert><button id="in-inert">Inerte</button></div>
      <button id="visible">Cancelar</button>
    `);

    expect(idsOf(getFocusableElements(container))).toEqual(["visible"]);
  });

  it("returns an empty list when nothing can be focused", () => {
    const container = createContainer("<p>Términos y condiciones.</p>");

    expect(getFocusableElements(container)).toEqual([]);
  });
});
