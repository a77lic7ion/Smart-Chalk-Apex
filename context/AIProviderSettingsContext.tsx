import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AISettings } from '../types';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  geminiApiKey: '',
  openAIKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
};

const storageKey = 'aiProviderSettings';

interface AIProviderSettingsContextType {
  settings: AISettings;
  setSettings: (settings: Partial<AISettings>) => void;
}

const AIProviderSettingsContext = createContext<AIProviderSettingsContextType | undefined>(undefined);

export const AIProviderSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<AISettings>(() => {
    try {
      const storedSettings = localStorage.getItem(storageKey);
      if (storedSettings) {
        // Merge stored settings with defaults to ensure all keys are present
        return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      }
    } catch (error) {
      console.error("Failed to parse settings from localStorage", error);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings to localStorage", error);
    }
  }, [settings]);

  const setSettings = (newSettings: Partial<AISettings>) => {
    setSettingsState(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AIProviderSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </AIProviderSettingsContext.Provider>
  );
};

export const useAIProviderSettings = (): AIProviderSettingsContextType => {
  const context = useContext(AIProviderSettingsContext);
  if (context === undefined) {
    throw new Error('useAIProviderSettings must be used within a AIProviderSettingsProvider');
  }
  return context;
};