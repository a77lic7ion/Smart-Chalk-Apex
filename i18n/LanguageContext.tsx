import React, { createContext, useContext, useState, ReactNode } from 'react';
import translations from './en.json';

type Translations = typeof translations;

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string, options?: { fallback?: string; [key: string]: any }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper to access nested keys like 'a.b.c'
const getNestedKey = (obj: any, path: string): string | undefined => {
    return path.split('.').reduce((o, k) => (o && o[k] !== 'undefined' ? o[k] : undefined), obj);
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState('en');

    const t = (key: string, options?: { fallback?: string; [key: string]: any }): string => {
        let translation = getNestedKey(translations, key);

        if (!translation) {
            return options?.fallback || key;
        }

        if (options) {
            Object.keys(options).forEach(optionKey => {
                if (optionKey !== 'fallback') {
                    translation = translation.replace(`{{${optionKey}}}`, options[optionKey]);
                }
            });
        }

        return translation;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};