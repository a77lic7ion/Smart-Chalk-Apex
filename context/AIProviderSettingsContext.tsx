import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AIProvider, AISettings } from '../types';

export const PROVIDER_ENDPOINT_DEFAULTS: Record<AIProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  mistral: 'https://api.mistral.ai/v1',
  ollama: 'http://localhost:11434',
  cloudOllama: 'https://ollama.com',
  lmStudio: 'http://localhost:1234/v1',
  openRouter: 'https://openrouter.ai/api/v1',
  nous: 'https://inference-api.nousresearch.com/v1',
  custom: '',
  openai: 'https://api.openai.com/v1',
};

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Gemini',
  mistral: 'Mistral',
  ollama: 'Ollama',
  cloudOllama: 'Cloud Ollama',
  lmStudio: 'LM Studio',
  openRouter: 'OpenRouter',
  nous: 'NOUS',
  custom: 'Custom endpoint',
  openai: 'OpenAI',
};

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  geminiApiKey: '',
  openAIKey: '',
  ollamaUrl: PROVIDER_ENDPOINT_DEFAULTS.ollama,
  ollamaModel: 'llama3',
  providerApiKeys: {},
  providerEndpoints: { ...PROVIDER_ENDPOINT_DEFAULTS },
  selectedModels: {},
  customProviderName: '',
  customEndpoint: '',
  customApiKey: '',
};

const storageKey = 'aiProviderSettings';

interface AIProviderSettingsContextType {
  settings: AISettings;
  setSettings: (settings: Partial<AISettings>) => void;
}

const AIProviderSettingsContext = createContext<AIProviderSettingsContextType | undefined>(undefined);

const migrateSettings = (stored: Partial<AISettings>): AISettings => ({
  ...DEFAULT_SETTINGS,
  ...stored,
  providerEndpoints: {
    ...DEFAULT_SETTINGS.providerEndpoints,
    ...(stored.providerEndpoints ?? {}),
    // Migrate the previously shipped NOUS default to the current inference API host.
    nous: stored.providerEndpoints?.nous === 'https://api.nousresearch.com/v1' || !stored.providerEndpoints?.nous
      ? DEFAULT_SETTINGS.providerEndpoints.nous
      : stored.providerEndpoints.nous,
  },
  selectedModels: { ...DEFAULT_SETTINGS.selectedModels, ...(stored.selectedModels ?? {}) },
  provider: stored.provider ?? 'gemini',
  providerApiKeys: {
    ...DEFAULT_SETTINGS.providerApiKeys,
    ...(stored.providerApiKeys ?? {}),
    ...(stored.geminiApiKey ? { gemini: stored.geminiApiKey } : {}),
    ...(stored.openAIKey ? { openai: stored.openAIKey } : {}),
  },
});

export const AIProviderSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<AISettings>(() => {
    try {
      const storedSettings = localStorage.getItem(storageKey);
      if (storedSettings) return migrateSettings(JSON.parse(storedSettings));
    } catch (error) {
      console.error('Failed to parse settings from localStorage', error);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage', error);
    }
  }, [settings]);

  const setSettings = (newSettings: Partial<AISettings>) => {
    setSettingsState(prev => migrateSettings({ ...prev, ...newSettings }));
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
