# Unit Testing Standards — Page Object Model

Usar este skill al escribir, actualizar o revisar tests unitarios/de componentes. Adaptado de un repo de referencia enterprise en Next.js que el profesor del curso compartió.

Ver también: [component-architecture](../component-architecture/SKILL.md)

Usar siempre el **Page Object Model (POM)** para tests de interacción con UI/componentes. Los tests no deben tener `screen.getBy*`/`fireEvent` sueltos dispersos por la suite — las queries y acciones de usuario viven en un Page Object; los specs solo aseveran comportamiento a través de esa API.

## 1. Herramientas

| Capa | Paquete |
|---|---|
| Runner | Vitest |
| Render de componentes | `@testing-library/react` |
| Interacciones | `@testing-library/user-event` |
| Matchers de DOM | `@testing-library/jest-dom` |

Preferir las queries accesibles de Testing Library sobre APIs de shallow-rendering o de detalle de implementación.

### 1.1 Cómo correr los tests

```bash
npm test             # corre todo una vez (lo mismo que el CI)
npm run test:watch   # modo watch mientras se escribe código
npx vitest run features/shopping-list   # solo los tests de una carpeta
```

- Configuración en `vitest.config.mts` (raíz). Toma cualquier `*.test.ts` o `*.test.tsx`, fuera de `node_modules/`, `.next/` y `supabase/functions/` (Deno).
- El alias `@/` funciona igual que en `tsconfig.json`.
- **Entorno por defecto: Node.** Los tests de funciones puras (utils, reducers, validaciones) no necesitan navegador y arrancan en menos de un segundo. Un test de componente pide el navegador simulado con este comentario en la **primera línea** del archivo:

  ```ts
  // @vitest-environment jsdom
  ```

- `vitest.setup.ts` agrega los matchers de `@testing-library/jest-dom` (`toBeInTheDocument`, `toBeDisabled`, ...).
- Importar `describe`, `it`, `expect` y `vi` desde `vitest` en cada archivo (no hay globals): así cada test dice de dónde sale cada cosa.
- Versiones fijadas para Node 20 (el del CI): Vitest 4 y jsdom 29. Vitest 5 y jsdom 30 piden Node 22; subirlos es cambiar primero la versión de Node del proyecto.

## 2. Layout de tests colocalizado por feature

Los tests viven dentro de la carpeta de la feature, siguiendo [component-architecture](../component-architecture/SKILL.md):

```
<feature-name>/
  FeatureName.tsx
  hooks/useFeatureNameViewModel.ts
  tests/
    FeatureName.page.ts              ← Page Object (POM)
    FeatureName.test.tsx             ← tests de componente/integración
    useFeatureNameViewModel.test.ts  ← opcional: tests puros del ViewModel (no necesita POM)
  specs/SPEC.md                      ← criterios de aceptación a mapear en tests
```

No crear un `tests/page-objects/` global para UI específica de una feature. Helpers de test compartidos (un `renderWithProviders`) pueden vivir en un `test-utils/` de nivel raíz una vez que una segunda feature necesite el mismo setup.

## 3. Reglas del Page Object

Un Page Object:

- Encapsula **cómo** encontrar elementos (roles, labels — `data-testid` solo cuando es inevitable)
- Encapsula **acciones de usuario** (`fillEmail`, `submit`, `openConfirmModal`)
- Expone **queries legibles** para las aserciones (`getErrorMessage()`, `isSubmitDisabled()`)
- **No** contiene `expect` — las aserciones son del spec
- **No** contiene lógica de negocio/producto — solo una API de interacción de UI

Nombrado: `FeatureName.page.ts`, factory `createFeatureNamePage` (función flecha).

**Incorrecto** — queries crudas inline en cada test:

```tsx
it("submits the form", async () => {
  const user = userEvent.setup();
  render(<ShoppingListForm {...props} />);
  await user.type(screen.getByLabelText("Item name"), "Milk");
  await user.click(screen.getByRole("button", { name: "Add" }));
  expect(screen.getByText("Added")).toBeInTheDocument();
});
```

**Correcto** — Page Object + spec delgado:

```ts
// tests/ShoppingListForm.page.ts
export const createShoppingListFormPage = () => {
  const user = userEvent.setup();

  const getItemInput = () => screen.getByLabelText(/item name/i);
  const getAddButton = () => screen.getByRole("button", { name: /add/i });
  const getConfirmation = () => screen.getByText(/added/i);

  const fillItemName = async (name: string) => {
    await user.type(getItemInput(), name);
  };

  const submit = async () => {
    await user.click(getAddButton());
  };

  return { fillItemName, submit, getConfirmation };
};
```

```tsx
// tests/ShoppingListForm.test.tsx
describe("ShoppingListForm", () => {
  it("adds an item and shows confirmation", async () => {
    render(<ShoppingListForm {...props} />);
    const page = createShoppingListFormPage();

    await page.fillItemName("Milk");
    await page.submit();

    expect(page.getConfirmation()).toBeInTheDocument();
  });
});
```

Un Page Object por pantalla/feature bajo test. Un widget hijo reutilizado puede tener su propio `*.page.ts` si se ejercita desde varios tests padre; si no, mantener sus acciones en el Page Object del padre.

## 4. Qué testear a nivel unitario

| Objetivo | Cómo | ¿POM? |
|---|---|---|
| UI de una feature (`.tsx`) | Render + interacción vía Page Object | Sí |
| Hooks ViewModel | `renderHook` / llamadas directas; mockear APIs/store | No |
| Utils/mappers puros | Tests directos de la función | No |
| Lógica de store/reducer | Alimentar acciones → asegurar estado | No |

Preferir testear comportamiento atado a los criterios de aceptación de `specs/SPEC.md` sobre hacer snapshot de árboles DOM grandes.

## 5. Guías para tests de componentes

- Envolver con los providers que la feature necesite (`Provider` del store, query client, mocks de auth) vía un helper de render compartido una vez que exista.
- Mockear llamadas de red/backend/realtime en el borde — sin I/O real en tests unitarios.
- Asegurar sobre **resultados** (texto visible, estado disabled, callback invocado), no detalles de implementación (estado interno, strings de clases CSS no relacionadas).
- Tests determinísticos: sin timers/red reales; usar fake timers para comportamiento de debounce/timeout, con el valor sacado de [constants-standards](../constants-standards/SKILL.md) en vez de un número mágico re-escrito.

## 6. Arrange · Act · Assert

1. **Arrange** — renderizar la feature (construir el Page Object)
2. **Act** — llamar acciones del Page Object
3. **Assert** — `expect` sobre queries del Page Object o dependencias mockeadas

Un solo act por test. Nombrar los tests por comportamiento (`"disables submit while saving"`), no por mecánica (`"click button"`).

## 7. SDD + testing

Cuando aplica el SDD de [component-architecture](../component-architecture/SKILL.md): mapear cada criterio de aceptación de `specs/SPEC.md` a al menos un nombre de test, implementar/ajustar el Page Object a medida que la UI se estabiliza, y correr los tests de la feature antes de dar el trabajo por terminado.

## 8. Checklist

- [ ] Tests colocalizados bajo el `tests/` de la feature
- [ ] Tests de UI pasan por un Page Object `*.page.ts` — sin queries crudas duplicadas entre specs
- [ ] El Page Object no tiene `expect` — los specs son dueños de las aserciones
- [ ] Las queries prefieren roles/labels sobre `data-testid`
- [ ] ViewModel/lógica pura testeada sin forzar un POM
- [ ] I/O externo mockeado; sin red/backend real en tests unitarios
- [ ] Criterios de aceptación de `specs/SPEC.md` cubiertos donde aplique
