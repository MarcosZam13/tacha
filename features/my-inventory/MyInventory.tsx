"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button, Spinner } from "@/components/ui";
import { APP_ROUTE, BUTTON_VARIANT } from "@/constants";
import { InventoryGroupSection } from "./components/InventoryGroupSection";
import { MY_INVENTORY_STATUS, MY_INVENTORY_TEXT } from "./constants/my-inventory.constants";
import { useMyInventoryViewModel } from "./hooks/useMyInventoryViewModel";

/**
 * Pantalla "Mi inventario" (SCRUM-105 / HU-71b): lo que la app cree que hay en
 * casa, agrupado por urgencia. Se entra desde General (enlace del encabezado y
 * de "¿Se te acabó?"); es un complemento de las sugerencias, no las reemplaza
 * (CA-03). "use client" porque usa hooks y habla con Supabase desde el navegador.
 *
 * SCRUM-106: el aviso de cada acción va a una región "status" oculta, y
 * después de "Ya se acabó" (la fila desaparece) el foco pasa al título.
 */
export const MyInventory = (): React.JSX.Element => {
  const viewModel = useMyInventoryViewModel();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { titleFocusRequest } = viewModel;

  useEffect(() => {
    if (titleFocusRequest > 0) titleRef.current?.focus();
  }, [titleFocusRequest]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Link href={APP_ROUTE.LIST} className="self-start font-body text-sm text-tacha-teal hover:underline">
        {MY_INVENTORY_TEXT.BACK_TO_LIST}
      </Link>
      {/* tabIndex -1: se le puede dar el foco desde el código, pero no entra en el recorrido con Tab. */}
      <h1 ref={titleRef} tabIndex={-1} className="font-display text-3xl font-bold text-tacha-text focus:outline-none">
        {MY_INVENTORY_TEXT.TITLE}
      </h1>
      <p role="status" className="sr-only">
        {viewModel.announcement}
      </p>

      {viewModel.status === MY_INVENTORY_STATUS.LOADING ? <Spinner label={MY_INVENTORY_TEXT.LOADING} /> : null}
      {viewModel.status === MY_INVENTORY_STATUS.ERROR ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="font-body text-sm text-red-600">
            {viewModel.errorMessage}
          </p>
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={viewModel.reload}>
            {MY_INVENTORY_TEXT.RETRY}
          </Button>
        </div>
      ) : null}
      {viewModel.status === MY_INVENTORY_STATUS.EMPTY ? (
        <p className="rounded-tacha-card border border-dashed border-tacha-border p-6 text-center font-body text-sm text-tacha-textsec">
          {MY_INVENTORY_TEXT.EMPTY}
        </p>
      ) : null}
      {viewModel.status === MY_INVENTORY_STATUS.READY
        ? viewModel.groups.map((group) => (
            <InventoryGroupSection key={group.group} group={group} actions={viewModel.actions} />
          ))
        : null}
    </div>
  );
};
