import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@app_language";

export type Language = "english" | "hindi" | "arabic";

const localeMap: Record<Language, string> = {
  english: "en",
  hindi: "hi",
  arabic: "ar",
};

const translations: Record<string, Record<string, unknown>> = {
  en: require("@/locales/en.json"),
  hi: require("@/locales/hi.json"),
  ar: require("@/locales/ar.json"),
};

type TranslationContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("english");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "english" || stored === "hindi" || stored === "arabic") {
        setLanguageState(stored);
      }
      setReady(true);
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      if (!ready) return key;
      const locale = localeMap[language];
      const obj = translations[locale] ?? translations.en;
      const value = getNested(obj as Record<string, unknown>, key);
      return typeof value === "string" ? value : key;
    },
    [language, ready]
  );

  const value: TranslationContextValue = { language, setLanguage, t };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error("useTranslation must be used within TranslationProvider");
  return ctx;
}
