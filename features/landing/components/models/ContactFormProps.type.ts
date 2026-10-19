import type { ContactFormViewModel } from "../../models/ContactFormViewModel.interface";

// El formulario recibe todo lo del ViewModel menos lo de la pantalla de éxito.
export type ContactFormProps = Omit<ContactFormViewModel, "handleSendAnother" | "isSuccess">;
