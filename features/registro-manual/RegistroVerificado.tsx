"use client";

import { ReenvioCorreoForm } from "./components/ReenvioCorreoForm";
import { VERIFICATION_LABEL, VERIFICATION_LINK_STATUS } from "./constants/registro.constants";
import { useRegistroVerificadoViewModel } from "./hooks/useRegistroVerificadoViewModel";

/**
 * Página a la que lleva el enlace del correo. "use client" porque el resultado viene en el
 * fragmento de la URL (#...), que solo existe en el navegador.
 */
export const RegistroVerificado = (): React.JSX.Element => {
  const { linkStatus } = useRegistroVerificadoViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      {linkStatus === VERIFICATION_LINK_STATUS.CONFIRMED ? (
        <section className="flex flex-col gap-2 font-body">
          <h1 className="font-display text-3xl font-bold text-tacha-text">
            {VERIFICATION_LABEL.CONFIRMED_TITLE}
          </h1>
          <p role="status" className="text-sm text-tacha-teal">
            {VERIFICATION_LABEL.CONFIRMED_MESSAGE}
          </p>
        </section>
      ) : linkStatus === VERIFICATION_LINK_STATUS.INVALID ? (
        <section className="flex flex-col gap-4 font-body">
          <h1 className="font-display text-3xl font-bold text-tacha-text">
            {VERIFICATION_LABEL.EXPIRED_TITLE}
          </h1>
          <p className="text-sm text-tacha-text">{VERIFICATION_LABEL.EXPIRED_MESSAGE}</p>
          <ReenvioCorreoForm />
        </section>
      ) : null}
    </main>
  );
};