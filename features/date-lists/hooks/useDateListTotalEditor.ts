import { useState } from "react";
import { parseColonesAmount } from "@/features/finance/utils/parseColonesAmount";
import type { NullableRef } from "@/types/nullable.types";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";

export interface DateListTotalEditor {
  errorMessage: NullableRef<string>;
  isOpen: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onOpen: (currentTotal: NullableRef<number>) => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  text: string;
}

/**
 * El campo del total gastado de una sublista (SCRUM-79, SPEC §10). Solo el estado del campo: guardar
 * lo hace `saveTotal`, que recibe del ViewModel y responde si se guardó.
 *
 * El monto se valida con `parseColonesAmount` de Finanzas (regla 2): la misma regla que un total del
 * historial, así "12.5" se rechaza en vez de adivinarse como 125. Si falla, el campo queda abierto con
 * lo escrito, para corregirlo sin volver a empezar.
 */
export const useDateListTotalEditor = (saveTotal: (total: number) => Promise<boolean>): DateListTotalEditor => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState<NullableRef<string>>(null);

  const close = (): void => {
    setIsOpen(false);
    setErrorMessage(null);
  };

  const save = async (): Promise<void> => {
    const parsed = parseColonesAmount(text);
    if (!parsed.isValid) {
      setErrorMessage(DATE_LIST_TEXT.TOTAL_INVALID);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    const isSaved = await saveTotal(parsed.amount);
    setIsSaving(false);

    if (isSaved) {
      close();
      return;
    }
    setErrorMessage(DATE_LIST_TEXT.TOTAL_ERROR);
  };

  return {
    errorMessage,
    isOpen,
    isSaving,
    onCancel: close,
    onOpen: (currentTotal) => {
      // Abre con el total que hay, para cambiarlo sin reescribirlo entero.
      setText(currentTotal === null ? "" : String(currentTotal));
      setErrorMessage(null);
      setIsOpen(true);
    },
    onSave: () => void save(),
    onTextChange: (newText) => {
      setText(newText);
      // El error de validación se va al escribir: ya no describe lo que hay en el campo.
      setErrorMessage(null);
    },
    text,
  };
};
