import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO, LANDING_ROUTE } from "../constants/landing.constants";

export const Logo = (): React.JSX.Element => (
  <Link
    href={LANDING_ROUTE.HOME}
    aria-label={BRAND_LOGO.LINK_LABEL}
    className="inline-flex shrink-0 items-center gap-2"
  >
    <span className="flex size-10 items-center justify-center overflow-hidden rounded-tacha-badge bg-white">
      <Image
        src={BRAND_LOGO.IMAGE_SRC}
        alt=""
        width={BRAND_LOGO.IMAGE_SIZE_PX}
        height={BRAND_LOGO.IMAGE_SIZE_PX}
        className="size-full object-contain"
      />
    </span>
    <span className="font-display text-2xl font-bold text-tacha-text">{BRAND_LOGO.NAME}</span>
  </Link>
);
