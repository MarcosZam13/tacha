import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TESTIMONIALS_TEXT } from "../constants/landing.constants";

export const createTestimonialsCarouselPage = () => {
  const user = userEvent.setup();

  const getQuote = (quote: string): HTMLElement => screen.getByText(quote, { exact: false });
  const getAuthor = (name: string): HTMLElement => screen.getByText(name);
  const queryNextButton = (): HTMLElement | null =>
    screen.queryByRole("button", { name: TESTIMONIALS_TEXT.NEXT_LABEL });

  const goNext = async (): Promise<void> => {
    await user.click(screen.getByRole("button", { name: TESTIMONIALS_TEXT.NEXT_LABEL }));
  };

  const goPrevious = async (): Promise<void> => {
    await user.click(screen.getByRole("button", { name: TESTIMONIALS_TEXT.PREVIOUS_LABEL }));
  };

  return { getAuthor, getQuote, goNext, goPrevious, queryNextButton };
};
