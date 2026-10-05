"use client";

import { createI18n } from "@viapay/prefs";
import { MESSAGES } from "./messages";

export const { LocaleProvider, useLocale, SiteControls } = createI18n(MESSAGES);
