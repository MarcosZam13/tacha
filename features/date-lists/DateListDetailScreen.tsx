"use client";

import Link from "next/link";
import { ProductSearch } from "@/components/product-search/ProductSearch";
import { Button, Modal, Spinner } from "@/components/ui";
import { APP_ROUTE, BUTTON_VARIANT } from "@/constants";
import { DateListItemRow } from "./components/DateListItemRow";
import { DATE_LIST_STATUS_LABEL, DATE_LIST_TEXT } from "./constants/date-lists.constants";
import { useDateListDetailViewModel } from "./hooks/useDateListDetailViewModel";
import { formatEventDate } from "./utils/eventDate";

interface DateListDetailScreenProps {
  listId: string;
}

/** Detalle de una sublista: el mismo buscador de la lista general (CA-03) y sus productos. */
export const DateListDetailScreen = ({ listId }: DateListDetailScreenProps): React.JSX.Element => {
  const viewModel = useDateListDetailViewModel(listId);
  const { detail } = viewModel;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Link href={APP_ROUTE.DATE_LISTS} className="font-body text-sm text-tacha-teal hover:underline">
        {DATE_LIST_TEXT.BACK}
      </Link>

      {viewModel.isLoading ? <Spinner /> : null}
      {viewModel.loadErrorMessage ? (
        <p role="alert" className="font-body text-sm text-tacha-danger">
          {viewModel.loadErrorMessage}
        </p>
      ) : null}
      {viewModel.isNotFound ? (
        <p className="font-body text-sm text-tacha-textsec">{DATE_LIST_TEXT.DETAIL_NOT_FOUND}</p>
      ) : null}

      {detail ? (
        <>
          <header className="flex flex-col gap-1">
            <h1 className="break-words font-display text-3xl font-bold text-tacha-text">{detail.name}</h1>
            <p className="font-body text-sm text-tacha-textsec">
              {formatEventDate(detail.eventDate)} · {DATE_LIST_STATUS_LABEL[detail.status]}
            </p>
          </header>

          {viewModel.isCancelled ? (
            <div className="flex flex-col items-start gap-3">
              <p className="font-body text-sm text-tacha-textsec">{DATE_LIST_TEXT.CANCELLED_NOTICE}</p>
              <Button isDisabled={viewModel.isSaving} onClick={viewModel.onReactivate}>
                {DATE_LIST_TEXT.REACTIVATE}
              </Button>
            </div>
          ) : (
            <ProductSearch
              errorMessage={viewModel.searchErrorMessage}
              hasNoResults={viewModel.hasNoSearchResults}
              isSearching={viewModel.isSearching}
              onQueryChange={viewModel.onQueryChange}
              onSelectOption={viewModel.onSelectSearchOption}
              options={viewModel.searchOptions}
              query={viewModel.query}
            />
          )}

          {viewModel.actionErrorMessage ? (
            <p role="alert" className="font-body text-sm text-tacha-danger">
              {viewModel.actionErrorMessage}
            </p>
          ) : null}

          {detail.items.length === 0 ? (
            <p className="font-body text-sm text-tacha-textsec">{DATE_LIST_TEXT.DETAIL_EMPTY}</p>
          ) : (
            <ul className="divide-y divide-tacha-border rounded-tacha-card border border-tacha-border bg-tacha-surface">
              {detail.items.map((item) => (
                <DateListItemRow
                  key={item.id}
                  isDisabled={viewModel.isSaving || viewModel.isCancelled}
                  item={item}
                  onDecrease={() => viewModel.onDecreaseQuantity(item.id)}
                  onIncrease={() => viewModel.onIncreaseQuantity(item.id)}
                  onRemove={() => viewModel.onRemoveItem(item.id)}
                  onToggle={(isChecked) => viewModel.onToggleItem(item.id, isChecked)}
                />
              ))}
            </ul>
          )}

          {viewModel.isCancelled ? null : (
            <div>
              <Button
                isDisabled={viewModel.isSaving}
                variant={BUTTON_VARIANT.SECONDARY}
                onClick={viewModel.onRequestCancel}
              >
                {DATE_LIST_TEXT.CANCEL_LIST}
              </Button>
            </div>
          )}

          <Modal
            isOpen={viewModel.isCancelConfirmOpen}
            onClose={viewModel.onDismissCancel}
            title={DATE_LIST_TEXT.CANCEL_CONFIRM_TITLE}
          >
            <p className="font-body text-sm text-tacha-textsec">{DATE_LIST_TEXT.CANCEL_CONFIRM_BODY}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant={BUTTON_VARIANT.SECONDARY} onClick={viewModel.onDismissCancel}>
                {DATE_LIST_TEXT.CANCEL_KEEP}
              </Button>
              <Button variant={BUTTON_VARIANT.DESTRUCTIVE} onClick={viewModel.onConfirmCancel}>
                {DATE_LIST_TEXT.CANCEL_CONFIRM}
              </Button>
            </div>
          </Modal>
        </>
      ) : null}
    </div>
  );
};
