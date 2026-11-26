import Image from "next/image";
import { DEMO_IMAGE, DEMO_TEXT, LANDING_SECTION_ID } from "../constants/landing.constants";

/**
 * "Así se ve Tacha" (SCRUM-152): capturas reales de la lista general, en la
 * computadora y en el celular, en vez del recuadro "Aquí va la demo, pendiente".
 * En pantallas chicas solo se ve la del celular: la de escritorio quedaría
 * ilegible a 390 px. Las imágenes viven en public/landing/.
 */
export const DemoSection = (): React.JSX.Element => (
  <section id={LANDING_SECTION_ID.DEMO} className="bg-tacha-surface px-4 py-16 md:px-10">
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2 text-center">
        <h2 className="font-display text-3xl font-bold text-tacha-text">{DEMO_TEXT.TITLE}</h2>
        <p className="mx-auto max-w-2xl font-body text-tacha-textsec">{DEMO_TEXT.DESCRIPTION}</p>
      </header>
      <div className="flex items-end justify-center gap-6">
        <Image
          src={DEMO_IMAGE.DESKTOP_SRC}
          alt={DEMO_TEXT.DESKTOP_ALT}
          width={DEMO_IMAGE.DESKTOP_WIDTH_PX}
          height={DEMO_IMAGE.DESKTOP_HEIGHT_PX}
          sizes="(min-width: 768px) 720px, 100vw"
          className="hidden h-auto w-full max-w-3xl rounded-tacha-card border border-tacha-border shadow-lg md:block"
        />
        <Image
          src={DEMO_IMAGE.MOBILE_SRC}
          alt={DEMO_TEXT.MOBILE_ALT}
          width={DEMO_IMAGE.MOBILE_WIDTH_PX}
          height={DEMO_IMAGE.MOBILE_HEIGHT_PX}
          sizes="(min-width: 768px) 200px, 280px"
          className="h-auto w-[280px] rounded-tacha-card border border-tacha-border shadow-lg md:w-[200px]"
        />
      </div>
    </div>
  </section>
);
