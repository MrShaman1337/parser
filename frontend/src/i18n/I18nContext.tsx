import React, { createContext, useContext, useMemo, useState } from "react";
import { Lang, translations } from "./translations";

type I18nContextValue = {
  lang: Lang;
  region: "eu" | "ru";
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const getInitialLang = (): Lang => {
  const stored = window.localStorage.getItem("lang");
  return stored === "ru" ? "ru" : "en";
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(getInitialLang);
  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("lang", next);
  };
  const t = (key: string) => translations[lang][key] || key;
  const region = lang === "ru" ? "ru" : "eu";
  const value = useMemo(() => ({ lang, setLang, t, region }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
