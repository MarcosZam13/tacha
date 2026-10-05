import { LANDING_SECTION_ID, TESTIMONIALS, TESTIMONIALS_TEXT } from "../constants/landing.constants";
import { TestimonialsCarousel } from "./TestimonialsCarousel";

export const TestimonialsSection = (): React.JSX.Element => (
  <section id={LANDING_SECTION_ID.TESTIMONIALS} className="px-4 py-16 md:px-10">
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h2 className="text-center font-display text-3xl font-bold text-tacha-text">{TESTIMONIALS_TEXT.TITLE}</h2>
      <TestimonialsCarousel testimonials={TESTIMONIALS} />
    </div>
  </section>
);
