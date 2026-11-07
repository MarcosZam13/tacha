import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { DateList } from "../models/DateList.interface";
import { createDateList } from "../services/date-lists.service";
import { toLocalIsoDate } from "../utils/eventDate";
import { validateDateListForm } from "../utils/validateDateListForm";
import type { DateListFormErrors } from "../utils/validateDateListForm";

const NO_ERRORS: DateListFormErrors = { dateError: null, nameError: null };

export interface CreateDateListFormViewModel extends DateListFormErrors {
  eventDate: string;
  isOpen: boolean;
  isSubmitting: boolean;
  name: string;
  onClose: () => void;
  onEventDateChange: (eventDate: string) => void;
  onNameChange: (name: string) => void;
  onOpen: (initialDate?: string) => void;
  onSubmit: () => Promise<void>;
  submitError: NullableRef<string>;
}

/** Estado del flujo corto de crear (CA-01): nombre y fecha, validar y llamar a la base. */
export const useCreateDateListForm = (onCreated: (createdList: DateList) => void): CreateDateListFormViewModel => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [errors, setErrors] = useState<DateListFormErrors>(NO_ERRORS);
  const [submitError, setSubmitError] = useState<NullableRef<string>>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // initialDate: el día que se tocó en el calendario (CA-01 de SCRUM-77).
  const onOpen = (initialDate = ""): void => {
    setName("");
    setEventDate(initialDate);
    setErrors(NO_ERRORS);
    setSubmitError(null);
    setIsOpen(true);
  };

  const onSubmit = async (): Promise<void> => {
    // Un doble clic no crea dos sublistas.
    if (isSubmitting) return;

    const validation = validateDateListForm(name, eventDate, toLocalIsoDate(new Date()));
    setErrors(validation);
    setSubmitError(null);
    if (validation.nameError || validation.dateError) return;

    setIsSubmitting(true);
    try {
      const createdList = await createDateList(name.trim(), eventDate);
      onCreated(createdList);
      setIsOpen(false);
    } catch {
      setSubmitError(DATE_LIST_TEXT.CREATE_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    ...errors,
    eventDate,
    isOpen,
    isSubmitting,
    name,
    onClose: () => setIsOpen(false),
    onEventDateChange: setEventDate,
    onNameChange: setName,
    onOpen,
    onSubmit,
    submitError,
  };
};
