const currencyFormatter = new Intl.NumberFormat("es-NI", {
  style: "currency",
  currency: "NIO",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

export const currency = (amount: number) => currencyFormatter.format(amount);

export const titleCaseStatus = (value: string) =>
  value.replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
