"use client";

import Link from "next/link";
import { Button, Spinner } from "@/components/ui";
import { APP_ROUTE, BUTTON_VARIANT } from "@/constants";
import { CreateProductGroupLink } from "./components/CreateProductGroupLink";
import { ProductGroupCard } from "./components/ProductGroupCard";
import { ProductGroupsEmptyState } from "./components/ProductGroupsEmptyState";
import { PRODUCT_GROUPS_STATUS, PRODUCT_GROUPS_TEXT } from "./constants/product-groups.constants";
import { useProductGroupsViewModel } from "./hooks/useProductGroupsViewModel";

/**
 * Pantalla "Mis grupos" (SCRUM-109 / HU-72), a la que se entra con
 * "Gestionar mis grupos" desde General. "use client" porque usa hooks y
 * habla con Supabase desde el navegador.
 */
export const ProductGroups = (): React.JSX.Element => {
  const viewModel = useProductGroupsViewModel();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <Link href={APP_ROUTE.LIST} className="self-start font-body text-sm text-tacha-teal hover:underline">
        {PRODUCT_GROUPS_TEXT.BACK_TO_LIST}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-tacha-text">{PRODUCT_GROUPS_TEXT.TITLE}</h1>
        <CreateProductGroupLink label={PRODUCT_GROUPS_TEXT.CREATE_GROUP} />
      </div>
      {viewModel.missingGroupNotice !== null ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.missingGroupNotice}
        </p>
      ) : null}

      {viewModel.status === PRODUCT_GROUPS_STATUS.LOADING ? <Spinner label={PRODUCT_GROUPS_TEXT.LOADING} /> : null}
      {viewModel.status === PRODUCT_GROUPS_STATUS.ERROR ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="font-body text-sm text-red-600">
            {viewModel.errorMessage}
          </p>
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={viewModel.reload}>
            {PRODUCT_GROUPS_TEXT.RETRY}
          </Button>
        </div>
      ) : null}
      {viewModel.status === PRODUCT_GROUPS_STATUS.EMPTY ? <ProductGroupsEmptyState /> : null}
      {viewModel.status === PRODUCT_GROUPS_STATUS.READY ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {viewModel.groups.map((group) => (
            <ProductGroupCard
              key={group.id}
              addToList={viewModel.getGroupAddToList(group.id)}
              group={group}
              onAddToList={viewModel.onAddToList}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
};
