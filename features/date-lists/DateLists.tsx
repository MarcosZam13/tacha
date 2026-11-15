"use client";

import { Button, Modal, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { CreateDateListForm } from "./components/CreateDateListForm";
import { DateCalendar } from "./components/DateCalendar";
import { DateListCard } from "./components/DateListCard";
import { DATE_LIST_TEXT } from "./constants/date-lists.constants";
import { useDateListsViewModel } from "./hooks/useDateListsViewModel";

/**
 * Sección Fechas: el calendario del mes (SCRUM-76), la agenda de ese mes y el
 * botón para crear (SCRUM-77). La agenda se queda porque en mobile es donde se
 * leen los nombres: en la celda solo cabe un punto.
 */
export const DateLists = (): React.JSX.Element => {
  const viewModel = useDateListsViewModel();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-tacha-text">{DATE_LIST_TEXT.TITLE}</h1>
        <Button variant={BUTTON_VARIANT.PRIMARY} onClick={() => viewModel.form.onOpen()}>
          {DATE_LIST_TEXT.NEW}
        </Button>
      </div>

      {viewModel.loadErrorMessage ? (
        <p role="alert" className="font-body text-sm text-tacha-danger">
          {viewModel.loadErrorMessage}
        </p>
      ) : null}
      {viewModel.isLoading ? <Spinner /> : null}
      {viewModel.isReady ? (
        <>
          <DateCalendar calendar={viewModel.calendar} onCreateOnDay={viewModel.form.onOpen} />
          {viewModel.calendar.listsOfMonth.length > 0 ? (
            <ul aria-label={DATE_LIST_TEXT.MONTH_LISTS_LABEL} className="flex flex-col gap-2">
              {viewModel.calendar.listsOfMonth.map((list) => (
                <DateListCard key={list.id} list={list} />
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-tacha-textsec">{viewModel.hasLists ? DATE_LIST_TEXT.MONTH_EMPTY : DATE_LIST_TEXT.EMPTY}</p>
          )}
        </>
      ) : null}

      <Modal isOpen={viewModel.form.isOpen} onClose={viewModel.form.onClose} title={DATE_LIST_TEXT.NEW}>
        <CreateDateListForm form={viewModel.form} />
      </Modal>
    </div>
  );
};
