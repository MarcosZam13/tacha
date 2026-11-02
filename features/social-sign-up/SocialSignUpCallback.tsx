"use client";

import Link from "next/link";
import { Spinner } from "@/components/ui";
import { SOCIAL_SIGN_UP_LABEL } from "./constants/social-sign-up.constants";
import { useSocialSignUpCallbackViewModel } from "./hooks/useSocialSignUpCallbackViewModel";

/**
 * Página a la que vuelve el proveedor. "use client" porque la sesión la guarda supabase-js
 * en el navegador.
 */
export const SocialSignUpCallback = (): React.JSX.Element => {
  const { feedback } = useSocialSignUpCallbackViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      {feedback ? (
        <section className="flex flex-col gap-4 font-body">
          <h1 className="font-display text-3xl font-bold text-tacha-text">{feedback.title}</h1>
          <p role="alert" className="text-sm text-tacha-text">
            {feedback.message}
          </p>
          <Link href={feedback.linkHref} className="text-sm text-tacha-teal underline">
            {feedback.linkLabel}
          </Link>
        </section>
      ) : (
        <Spinner label={SOCIAL_SIGN_UP_LABEL.CHECKING} />
      )}
    </main>
  );
};
