import en from "./locales/en.json";
import zhRCN from "./locales/zh-rCN.json";
export const languages = {
    en,
    zh_rCN: zhRCN,
};

export type Locale = keyof typeof languages;
