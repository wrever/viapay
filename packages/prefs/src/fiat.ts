/** Preferred display fiat for crypto≈fiat hints. Default Chile. */
export type FiatCode =
  | "CLP"
  | "ARS"
  | "COP"
  | "BOB"
  | "MXN"
  | "PEN"
  | "USD";

export const FIAT_CODES: FiatCode[] = [
  "CLP",
  "ARS",
  "COP",
  "BOB",
  "MXN",
  "PEN",
  "USD",
];

export const DEFAULT_FIAT: FiatCode = "CLP";

export const FIAT_KEY = "viapay-fiat";

export const FIAT_LABEL: Record<FiatCode, string> = {
  CLP: "CLP",
  ARS: "ARS",
  COP: "COP",
  BOB: "BOB",
  MXN: "MXN",
  PEN: "PEN",
  USD: "USD",
};

/** Short locale-aware currency names for selectors. */
export const FIAT_NAME: Record<FiatCode, { es: string; en: string; pt: string }> =
  {
    CLP: {
      es: "Peso chileno",
      en: "Chilean peso",
      pt: "Peso chileno",
    },
    ARS: {
      es: "Peso argentino",
      en: "Argentine peso",
      pt: "Peso argentino",
    },
    COP: {
      es: "Peso colombiano",
      en: "Colombian peso",
      pt: "Peso colombiano",
    },
    BOB: {
      es: "Boliviano",
      en: "Bolivian boliviano",
      pt: "Boliviano",
    },
    MXN: {
      es: "Peso mexicano",
      en: "Mexican peso",
      pt: "Peso mexicano",
    },
    PEN: {
      es: "Sol peruano",
      en: "Peruvian sol",
      pt: "Sol peruano",
    },
    USD: {
      es: "Dólar estadounidense",
      en: "US dollar",
      pt: "Dólar americano",
    },
  };

export function isFiatCode(value: string | null | undefined): value is FiatCode {
  return (
    value === "CLP" ||
    value === "ARS" ||
    value === "COP" ||
    value === "BOB" ||
    value === "MXN" ||
    value === "PEN" ||
    value === "USD"
  );
}

export function resolveFiat(stored: string | null | undefined): FiatCode {
  return isFiatCode(stored) ? stored : DEFAULT_FIAT;
}

export function readStoredFiat(): FiatCode {
  if (typeof window === "undefined") return DEFAULT_FIAT;
  try {
    return resolveFiat(localStorage.getItem(FIAT_KEY));
  } catch {
    return DEFAULT_FIAT;
  }
}

export function writeStoredFiat(code: FiatCode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FIAT_KEY, code);
    window.dispatchEvent(new Event("viapay-fiat"));
  } catch {
    // Ignore quota / private mode.
  }
}
