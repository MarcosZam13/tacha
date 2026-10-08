import type { Testimonial } from "./Testimonial.interface";

export interface TestimonialsCarouselViewModel {
  activeTestimonial: Testimonial;
  hasControls: boolean;
  positionLabel: string;
  showNext: () => void;
  showPrevious: () => void;
}
