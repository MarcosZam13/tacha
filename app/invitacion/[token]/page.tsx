import type { Metadata } from "next";
import { HouseholdInvitation } from "@/features/household/HouseholdInvitation";
import { HOUSEHOLD_JOIN_TEXT } from "@/features/household/constants/household.constants";

export const metadata: Metadata = {
  title: HOUSEHOLD_JOIN_TEXT.TITLE,
  // El token va en la URL: que no viaje en la cabecera Referer a otro sitio.
  referrer: "no-referrer",
};

// En Next 16 los parámetros de una ruta dinámica llegan como Promise.
interface InvitacionPageProps {
  params: Promise<{ token: string }>;
}

// key: si se navega de una invitación a otra, la pantalla empieza de cero.
const InvitacionPage = async ({ params }: InvitacionPageProps): Promise<React.JSX.Element> => {
  const { token } = await params;
  return <HouseholdInvitation key={token} token={token} />;
};

export default InvitacionPage;
