import React from 'react';
import { useAIProviderSettings, PROVIDER_ENDPOINT_DEFAULTS, PROVIDER_LABELS } from '../context/AIProviderSettingsContext';
import type { AIProvider, UserProfile, AISettings } from '../types';
import { db } from '../db';
import { saveAs } from 'file-saver';
import { Button } from './Button';
import { DocumentArrowDownIcon, UploadIcon } from './Icons';
import { discoverModels, type DiscoveredModel } from '../services/modelDiscovery';

const PROVIDERS: AIProvider[] = ['gemini', 'mistral', 'ollama', 'cloudOllama', 'lmStudio', 'openRouter', 'nous', 'custom'];

const PROVIDER_KEY_URLS: Partial<Record<AIProvider, { label: string; url: string }>> = {
  gemini: { label: 'Get a Gemini API key', url: 'https://aistudio.google.com/app/api-keys' },
  mistral: { label: 'Get a Mistral API key', url: 'https://console.mistral.ai/api-keys/' },
  ollama: { label: 'Manage Ollama keys', url: 'https://ollama.com/settings/keys' },
  cloudOllama: { label: 'Manage Ollama keys', url: 'https://ollama.com/settings/keys' },
  lmStudio: { label: 'LM Studio API docs', url: 'https://lmstudio.ai/docs/app/api/endpoints' },
  openRouter: { label: 'Get an OpenRouter key', url: 'https://openrouter.ai/keys' },
  nous: { label: 'Get a NOUS API key', url: 'https://portal.nousresearch.com/api-docs' },
};

const AdminSettings: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      const allData: { [key: string]: any[] } = {};
      for (const table of db.tables) allData[table.name] = await table.toArray();
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      saveAs(blob, `smartchalk_db_export_${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('Database export failed:', error);
      alert('Could not export the database. Check the console for more details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Are you sure you want to import this file? This will completely overwrite all existing data in the local database. This action cannot be undone.')) return;
    setIsImporting(true);
    try {
      const data = JSON.parse(await file.text());
      await db.transaction('rw', db.tables, async () => {
        for (const tableName in data) {
          if (Object.prototype.hasOwnProperty.call(data, tableName)) {
            const table = db.table(tableName);
            await table.clear();
            await table.bulkAdd(data[tableName]);
          }
        }
      });
      alert('Database imported successfully! The page will now reload.');
      window.location.reload();
    } catch (error) {
      console.error('Database import failed:', error);
      alert(`Could not import the database. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-md">
      <h3 className="mb-1 text-xl font-bold text-brand-black">Browser-local workspace tools</h3>
      <p className="mb-4 text-sm text-slate-500">Manage the standalone SmartChalk workspace. Saved content and provider settings remain in this browser.</p>
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="mb-2 text-lg font-semibold text-brand-black">Backup and restore</h4>
        <p className="text-sm text-slate-600">Export a JSON backup before clearing browser data or moving to another device.</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Button onClick={handleExportDatabase} isLoading={isExporting} variant="secondary"><DocumentArrowDownIcon className="mr-2 h-5 w-5" />Export Full Database (JSON)</Button>
        <Button onClick={() => fileInputRef.current?.click()} isLoading={isImporting} variant="secondary"><UploadIcon className="mr-2 h-5 w-5" />Import Database (JSON)</Button>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportDatabase} />
      <p className="mt-3 rounded-md bg-yellow-100 p-2 text-xs text-yellow-900"><strong>Warning:</strong> Importing will overwrite all existing local data.</p>
    </div>
  );
};

const SettingsContent: React.FC<{ user: UserProfile; isAdmin: boolean }> = ({ user, isAdmin }) => {
  const { settings, setSettings } = useAIProviderSettings();
  const [models, setModels] = React.useState<DiscoveredModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = React.useState(false);
  const [modelStatus, setModelStatus] = React.useState<{ tone: 'idle' | 'success' | 'error'; text: string }>({ tone: 'idle', text: '' });

  const provider = settings.provider;
  const endpoint = provider === 'custom' ? settings.customEndpoint : (settings.providerEndpoints[provider] || PROVIDER_ENDPOINT_DEFAULTS[provider] || '');
  const apiKey = provider === 'custom' ? settings.customApiKey : (settings.providerApiKeys[provider] || '');
  const selectedModel = settings.selectedModels[provider] || (provider === 'ollama' ? settings.ollamaModel : '');

  const update = (patch: Partial<AISettings>) => setSettings(patch);
  const updateProviderKey = (value: string) => update({ providerApiKeys: { ...settings.providerApiKeys, [provider]: value }, ...(provider === 'gemini' ? { geminiApiKey: value } : {}), ...(provider === 'openai' ? { openAIKey: value } : {}) });
  const updateEndpoint = (value: string) => {
    if (provider === 'custom') update({ customEndpoint: value });
    else update({ providerEndpoints: { ...settings.providerEndpoints, [provider]: value }, ...(provider === 'ollama' ? { ollamaUrl: value } : {}) });
  };
  const updateModel = (value: string) => update({ selectedModels: { ...settings.selectedModels, [provider]: value }, ...(provider === 'ollama' ? { ollamaModel: value } : {}) });

  const testAndFetchModels = async () => {
    setIsLoadingModels(true);
    setModelStatus({ tone: 'idle', text: 'Testing endpoint and fetching models…' });
    try {
      const discovered = await discoverModels({ provider, endpoint, apiKey, customEndpoint: settings.customEndpoint });
      setModels(discovered);
      if (discovered.length > 0 && !selectedModel) updateModel(discovered[0].id);
      setModelStatus({ tone: 'success', text: `${discovered.length} model${discovered.length === 1 ? '' : 's'} available${provider === 'openRouter' ? ' after the “free” filter' : ''}.` });
    } catch (error) {
      setModels([]);
      setModelStatus({ tone: 'error', text: error instanceof Error ? error.message : 'Model discovery failed.' });
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-8 mx-auto">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-brand-black">AI provider connections</h3>
            <p className="text-sm text-slate-500">Endpoints are prefilled. Add your key, test the connection, fetch models, then choose the model to use.</p>
          </div>
          <span className="rounded-full bg-brand-paper px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-charcoal">Saved locally</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {PROVIDERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => { update({ provider: item }); setModels([]); setModelStatus({ tone: 'idle', text: '' }); }}
              className={`provider-tab min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 ${provider === item ? 'provider-tab-active bg-brand-yellow text-brand-black shadow-sm' : 'bg-transparent text-brand-black hover:bg-brand-paper'}`}
            >
              {PROVIDER_LABELS[item]}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {provider === 'custom' && (
            <div>
              <label htmlFor="custom-provider-name" className="mb-1.5 block text-sm font-medium text-slate-700">Provider name</label>
              <input id="custom-provider-name" type="text" value={settings.customProviderName} onChange={(event) => update({ customProviderName: event.target.value })} placeholder="My local or hosted provider" className="w-full rounded-lg border border-slate-300 p-3 text-sm text-brand-black focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow" />
            </div>
          )}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="provider-endpoint" className="block text-sm font-medium text-slate-700">API endpoint</label>
              {PROVIDER_KEY_URLS[provider] && (
                <a
                  href={PROVIDER_KEY_URLS[provider].url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-black underline decoration-brand-yellow decoration-2 underline-offset-2 hover:text-brand-yellow"
                >
                  {PROVIDER_KEY_URLS[provider].label}
                </a>
              )}
            </div>
            <input id="provider-endpoint" type="url" value={endpoint} onChange={(event) => updateEndpoint(event.target.value)} placeholder="https://…" className="w-full rounded-lg border border-slate-300 p-3 text-sm text-brand-black focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow" />
            <p className="mt-1 text-xs text-slate-500">{provider === 'openRouter' ? 'OpenRouter results are limited to model IDs or names containing “free”.' : 'You can replace the prefilled endpoint with a compatible server URL.'}</p>
          </div>
          <div>
            <label htmlFor="provider-api-key" className="mb-1.5 block text-sm font-medium text-slate-700">API key {provider === 'ollama' || provider === 'lmStudio' ? <span className="font-normal text-slate-500">(optional for local servers)</span> : null}</label>
            <input id="provider-api-key" type="password" value={apiKey} onChange={(event) => provider === 'custom' ? update({ customApiKey: event.target.value }) : updateProviderKey(event.target.value)} placeholder={provider === 'gemini' ? 'Paste your Gemini key' : 'Paste your API key'} className="w-full rounded-lg border border-slate-300 p-3 text-sm text-brand-black focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow" autoComplete="off" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={testAndFetchModels} isLoading={isLoadingModels}>Test & fetch models</Button>
            {modelStatus.text && <p role="status" aria-live="polite" className={`text-sm ${modelStatus.tone === 'error' ? 'text-yellow-900' : modelStatus.tone === 'success' ? 'text-brand-charcoal' : 'text-slate-600'}`}>{modelStatus.text}</p>}
          </div>
          {models.length > 0 && (
            <div>
              <label htmlFor="provider-model" className="mb-1.5 block text-sm font-medium text-slate-700">Available model</label>
              <select id="provider-model" value={selectedModel} onChange={(event) => updateModel(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-brand-black focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow">
                {models.map((model) => <option key={model.id} value={model.id}>{model.label}{model.label !== model.id ? ` — ${model.id}` : ''}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
      {isAdmin && <AdminSettings user={user} />}
    </div>
  );
};

interface SettingsViewProps { user: UserProfile; isAdmin: boolean; }

export const SettingsView: React.FC<SettingsViewProps> = ({ user, isAdmin }) => (
  <main className="container mx-auto px-4 py-8">
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-brand-black md:text-4xl">Settings</h1>
        <p className="mt-1 text-lg text-slate-600">Manage application, AI provider, endpoint, and browser-local backup settings.</p>
      </div>
      <SettingsContent user={user} isAdmin={isAdmin} />
    </div>
  </main>
);
