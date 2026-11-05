"use client";

import { Button, Modal, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { CreateDateListForm } from "./components/CreateDateListForm";
import { DateListCard } from "./components/DateListCard";
import { DATE_LIST_TEXT } from "./constants/date-lists.constants";
import { useDateListsViewModel } from "./hooks/useDateListsViewModel";

/**
 * Sección Fechas: las sublistas ordenadas por fecha y el botón para crear
 * (SCRUM-77). La grilla de calendario llega con SCRUM-76 (SPEC §4).
 */
export const DateLists = (): React.JSX.Element => {
  const viewModel = useDateListsViewModel();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-tacha-text">{DATE_LIST_TEXT.TITLE}</h1>
        <Button variant={BUTTON_VARIANT.PRIMARY} onClick={viewModel.form.onOpen}>
          {DATE_LIST_TEXT.NEW}
        </Button>
      </div>

      {viewModel.loadErrorMessage ? (
        <p role="alert" className="font-body text-sm text-tacha-danger">
          {viewModel.loadErrorMessage}
        </p>
      ) : null}
      {viewModel.isLoading ? <Spinner /> : null}
      {viewModel.isEmpty ? <p className="font-body text-sm text-tacha-textsec">{DATE_LIST_TEXT.EMPTY}</p> : null}
      {viewModel.lists.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {viewModel.lists.map((list) => (
            <DateListCard key={list.id} list={list} />
          ))}
        </ul>
      ) : null}

      <Modal isOpen={viewModel.form.isOpen} onClose={viewModel.form.onClose} title={DATE_LIST_TEXT.NEW}>
        <CreateDateListForm form={viewModel.form} />
      </Modal>
    </div>
  );
};
