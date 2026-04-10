import en from "./locales/en.json";
import zh_rCN from "./locales/zh-rCN.json";
export const languages = {
    en,
    zh_rCN,
};

export type Locale = keyof typeof languages;