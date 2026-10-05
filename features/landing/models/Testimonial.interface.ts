export interface Testimonial {
  id: string;
  location: string;
  name: string;
  quote: string;
}

// Tupla con al menos un elemento: una lista vacía no compila.
export type TestimonialList = readonly [Testimonial, ...Testimonial[]];
