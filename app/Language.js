"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { sourceLabel } from "./source-label.mjs";
import { translate } from "./i18n.mjs";
const Context = createContext({ language: "en", t: value => value });
export const useLanguage = () => useContext(Context);
export function T({ children }) { return useLanguage().t(children); }
export function SourceLabel({ children }) { const { language } = useLanguage(); return sourceLabel(children, language); }
export function LocalNumber({ value }) { const { language } = useLanguage(); return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US").format(value); }
export function LocalDate({ value, options }) {
  const { language } = useLanguage(); const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", { timeZone: "UTC", ...options }).format(date)}</time>;
}
export default function Language({ initialLanguage = "en", children }) {
  const [language, setLanguage] = useState(initialLanguage);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function change(value) { setLanguage(value); document.cookie = `fxt_language=${value}; Path=/; Max-Age=31536000; SameSite=Lax`; try { localStorage.setItem("fxt_language", value); } catch { /* Cookies keep the preference if local storage is unavailable. */ } }
  return <Context.Provider value={{ language, t: value => translate(language, value) }}><div className="languageBar"><label htmlFor="site-language">🌐 <span>{language === "fr" ? "Langue" : "Language"}</span></label><select id="site-language" value={language} onChange={event => change(event.target.value)}><option value="en">English</option><option value="fr">Français</option></select></div>{children}</Context.Provider>;
}
