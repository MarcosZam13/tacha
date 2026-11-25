import Link from "next/link";
import { AUTH_ROUTE } from "@/constants";
import { COMPLETE_SIGN_UP_LABEL } from "../constants/complete-sign-up.constants";

/** Aviso de /registro/completar cuando no hay un registro social en curso. */
export const CompleteSignUpNoAccount = (): React.JSX.Element => (
  <section className="flex flex-col gap-4 font-body">
    <p role="alert" className="text-sm text-tacha-text">
      {COMPLETE_SIGN_UP_LABEL.NO_ACCOUNT_MESSAGE}
    </p>
    <Link href={AUTH_ROUTE.REGISTER} className="text-sm text-tacha-teal underline">
      {COMPLETE_SIGN_UP_LABEL.NO_ACCOUNT_LINK}
    </Link>
  </section>
);
