"use client";

import { createI18n } from "@viapay/prefs";
import { MESSAGES } from "./messages";

export const {
  LocaleProvider: CheckoutLocaleProvider,
  useLocale: useCheckoutLocale,
  SiteControls: CheckoutSiteControls,
} = createI18n(MESSAGES);
