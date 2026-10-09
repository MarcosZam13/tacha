import { useState } from "react";
import { TESTIMONIALS_TEXT } from "../constants/landing.constants";
import type { TestimonialList } from "../models/Testimonial.interface";
import type { TestimonialsCarouselViewModel } from "../models/TestimonialsCarouselViewModel.interface";

interface UseTestimonialsCarouselParams {
  testimonials: TestimonialList;
}

export const useTestimonialsCarouselViewModel = ({
  testimonials,
}: UseTestimonialsCarouselParams): TestimonialsCarouselViewModel => {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = testimonials.length;

  // Forma con función: el índice nuevo depende del anterior.
  // Sumar `total` antes del % evita un índice negativo al retroceder desde 0.
  const showPrevious = (): void => setActiveIndex((current) => (current - 1 + total) % total);
  const showNext = (): void => setActiveIndex((current) => (current + 1) % total);

  return {
    activeTestimonial: testimonials[activeIndex],
    hasControls: total > 1,
    positionLabel: `${activeIndex + 1} ${TESTIMONIALS_TEXT.POSITION_SEPARATOR} ${total}`,
    showNext,
    showPrevious,
  };
};
