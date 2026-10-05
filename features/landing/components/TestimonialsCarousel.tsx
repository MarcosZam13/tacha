"use client";

import { CAROUSEL_ICON_PATH, TESTIMONIALS_TEXT } from "../constants/landing.constants";
import { useTestimonialsCarouselViewModel } from "../hooks/useTestimonialsCarouselViewModel";
import type { TestimonialsCarouselProps } from "./models/TestimonialsCarouselProps.interface";

const ARROW_BUTTON_CLASS_NAME =
  "flex size-10 items-center justify-center rounded-full border border-tacha-teal text-tacha-teal hover:bg-tacha-teal/10";

export const TestimonialsCarousel = ({ testimonials }: TestimonialsCarouselProps): React.JSX.Element => {
  const { activeTestimonial, hasControls, positionLabel, showNext, showPrevious } =
    useTestimonialsCarouselViewModel({ testimonials });

  return (
    <div
      role="region"
      aria-roledescription={TESTIMONIALS_TEXT.ROLE_DESCRIPTION}
      aria-label={TESTIMONIALS_TEXT.REGION_LABEL}
      className="flex flex-col items-center gap-4"
    >
      <figure
        aria-live="polite"
        className="flex w-full flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-6"
      >
        <blockquote className="font-body text-lg text-tacha-text">“{activeTestimonial.quote}”</blockquote>
        <figcaption className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-tacha-chipbg font-display font-bold text-tacha-teal"
          >
            {activeTestimonial.name.charAt(0)}
          </span>
          <span className="flex flex-col">
            <span className="font-body text-sm font-semibold text-tacha-text">{activeTestimonial.name}</span>
            <span className="font-body text-xs text-tacha-textsec">{activeTestimonial.location}</span>
          </span>
        </figcaption>
      </figure>

      {hasControls && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={TESTIMONIALS_TEXT.PREVIOUS_LABEL}
            onClick={showPrevious}
            className={ARROW_BUTTON_CLASS_NAME}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="size-5">
              <path d={CAROUSEL_ICON_PATH.PREVIOUS} />
            </svg>
          </button>
          <p className="font-body text-sm text-tacha-textsec">{positionLabel}</p>
          <button
            type="button"
            aria-label={TESTIMONIALS_TEXT.NEXT_LABEL}
            onClick={showNext}
            className={ARROW_BUTTON_CLASS_NAME}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="size-5">
              <path d={CAROUSEL_ICON_PATH.NEXT} />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
