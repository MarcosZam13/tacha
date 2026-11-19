// "2099-12-20" → "20/12/2099". Arma el texto por partes: new Date("2099-12-20") lo leería como medianoche en UTC,
// que en Costa Rica es el día anterior (date-lists SPEC §5, regla 4).
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

export const formatListDate = (isoDate: string): string => {
  const parts = ISO_DATE_PATTERN.exec(isoDate);
  if (!parts) return isoDate;

  const [, year, month, day] = parts;

  return `${day}/${month}/${year}`;
};
