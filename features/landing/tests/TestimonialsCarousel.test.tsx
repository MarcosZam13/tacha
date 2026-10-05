// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TestimonialsCarousel } from "../components/TestimonialsCarousel";
import type { TestimonialList } from "../models/Testimonial.interface";
import { createTestimonialsCarouselPage } from "./TestimonialsCarousel.page";

const TESTIMONIALS_FIXTURE: TestimonialList = [
  { id: "ana", location: "Heredia", name: "Ana", quote: "Primera cita" },
  { id: "luis", location: "Cartago", name: "Luis", quote: "Segunda cita" },
  { id: "sofia", location: "Limón", name: "Sofía", quote: "Tercera cita" },
];

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

describe("TestimonialsCarousel", () => {
  it("shows the first testimonial with its author on load", () => {
    render(<TestimonialsCarousel testimonials={TESTIMONIALS_FIXTURE} />);
    const page = createTestimonialsCarouselPage();

    expect(page.getQuote("Primera cita")).toBeInTheDocument();
    expect(page.getAuthor("Ana")).toBeInTheDocument();
  });

  it("moves to the next testimonial", async () => {
    render(<TestimonialsCarousel testimonials={TESTIMONIALS_FIXTURE} />);
    const page = createTestimonialsCarouselPage();

    await page.goNext();

    expect(page.getQuote("Segunda cita")).toBeInTheDocument();
  });

  it("wraps to the last testimonial when going back from the first", async () => {
    render(<TestimonialsCarousel testimonials={TESTIMONIALS_FIXTURE} />);
    const page = createTestimonialsCarouselPage();

    await page.goPrevious();

    expect(page.getQuote("Tercera cita")).toBeInTheDocument();
  });

  it("hides the controls when there is a single testimonial", () => {
    render(<TestimonialsCarousel testimonials={[TESTIMONIALS_FIXTURE[0]]} />);
    const page = createTestimonialsCarouselPage();

    expect(page.queryNextButton()).not.toBeInTheDocument();
  });
});
