import type { Metadata } from "next";
import { RegistroVerificado } from "@/features/registro-manual/RegistroVerificado";
import { VERIFICATION_LABEL } from "@/features/registro-manual/constants/registro.constants";

export const metadata: Metadata = {
  title: VERIFICATION_LABEL.PAGE_TITLE,
};

const RegistroVerificadoPage = (): React.JSX.Element => <RegistroVerificado />;

export default RegistroVerificadoPage;