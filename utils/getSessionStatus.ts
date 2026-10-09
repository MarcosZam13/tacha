import type { Session } from "@supabase/supabase-js";
import type { NullableRef } from "@/types/nullable.types";
import { SESSION_STATUS } from "@/constants";
import type { SessionStatusType } from "@/constants";

// Una sesión anónima no cuenta: ensureSession la crea para cualquiera y el guard nunca redirigiría.
export const getSessionStatus = (session: NullableRef<Session>): SessionStatusType =>
  session && !session.user.is_anonymous
    ? SESSION_STATUS.AUTHENTICATED
    : SESSION_STATUS.UNAUTHENTICATED;