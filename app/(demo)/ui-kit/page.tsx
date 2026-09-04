"use client";

import { BUTTON_VARIANT, CHIP_TONE } from "@/app/constants";
import {
  Button,
  CategoryLabel,
  Checkbox,
  Chip,
  Input,
  ItemRow,
  Modal,
  Spinner,
  StatCard,
} from "@/app/components/ui";
import { useUiKitViewModel } from "./hooks/useUiKitViewModel";

/**
 * Página de desarrollo aislada para los primitivos base — sustituye a
 * Storybook mientras el proyecto no lo tenga configurado (ver
 * nextjs-enterprise-patterns §1). No es una pantalla de producto.
 */
const UiKitPage = (): React.JSX.Element => {
  const { isChecked, toggleChecked, isModalOpen, openModal, closeModal, inputValue, setInputValue } =
    useUiKitViewModel();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 p-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">Tacha — UI Kit</h1>

      <section className="flex flex-col gap-3">
        <CategoryLabel>Button</CategoryLabel>
        <div className="flex flex-wrap gap-3">
          <Button variant={BUTTON_VARIANT.PRIMARY}>Primario</Button>
          <Button variant={BUTTON_VARIANT.SECONDARY}>Secundario</Button>
          <Button variant={BUTTON_VARIANT.DESTRUCTIVE}>Destructivo</Button>
          <Button variant={BUTTON_VARIANT.PRIMARY} isDisabled>
            Deshabilitado
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <CategoryLabel>Input / FormField</CategoryLabel>
        <Input
          label="Nombre del producto"
          value={inputValue}
          onChange={setInputValue}
          helperText="Ej. Leche entera 1L"
        />
        <Input label="Correo" value="" onChange={() => {}} errorMessage="Correo inválido" />
      </section>

      <section className="flex flex-col gap-3">
        <CategoryLabel>Checkbox</CategoryLabel>
        <Checkbox isChecked={isChecked} onChange={toggleChecked} label="Acepto los términos" />
      </section>

      <section className="flex flex-col gap-3">
        <CategoryLabel>Spinner</CategoryLabel>
        <div className="flex items-center gap-4">
          <Spinner size="small" />
          <Spinner size="medium" />
          <Spinner size="large" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <CategoryLabel>Chip / Badge</CategoryLabel>
        <div className="flex gap-2">
          <Chip tone={CHIP_TONE.NEUTRAL}>Lácteos</Chip>
          <Chip tone={CHIP_TONE.TEAL}>Activo</Chip>
          <Chip tone={CHIP_TONE.TERRACOTTA}>₡800–₡1200</Chip>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <CategoryLabel>StatCard</CategoryLabel>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Gasto del mes" value="₡128,400" helperText="+12% vs. mes anterior" />
          <StatCard label="Productos activos" value="34" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <CategoryLabel>ItemRow</CategoryLabel>
        <div className="rounded-tacha-card border border-tacha-border bg-tacha-surface p-2">
          <ItemRow
            isChecked={isChecked}
            onToggle={toggleChecked}
            name="Leche entera — 1L"
            meta="Sublista · Receta pan de leche"
            badge={<Chip tone={CHIP_TONE.TERRACOTTA}>₡950</Chip>}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <CategoryLabel>Modal</CategoryLabel>
        <Button onClick={openModal}>Abrir modal</Button>
        <Modal isOpen={isModalOpen} onClose={closeModal} title="Confirmar acción">
          <p className="font-body text-sm text-tacha-textsec">
            Contenido de ejemplo del modal — cierra con click afuera o Escape.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant={BUTTON_VARIANT.SECONDARY} onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={closeModal}>Confirmar</Button>
          </div>
        </Modal>
      </section>
    </main>
  );
};

export default UiKitPage;
