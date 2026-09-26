import type { Metadata } from "next";
import { RegistroManual } from "@/features/registro-manual/RegistroManual";
import { REGISTRO_LABEL } from "@/features/registro-manual/constants/registro.constants";

export const metadata: Metadata = {
  title: REGISTRO_LABEL.TITLE,
};

const RegistroPage = (): React.JSX.Element => <RegistroManual />;

export default RegistroPage;
