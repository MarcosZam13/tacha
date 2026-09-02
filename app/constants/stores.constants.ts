export const STORE_NAMES = {
  MASXMENOS: "masxmenos",
  MAXIPALI: "maxipali",
  WALMART: "walmart",
} as const;

export const STORE_DISPLAY = {
  masxmenos: "MasXMenos",
  maxipali: "MaxiPali",
  walmart: "Walmart",
} as const;

export type StoreSlug = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];
