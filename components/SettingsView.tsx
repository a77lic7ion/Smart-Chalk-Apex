import React from 'react';
import { useAIProviderSettings } from '../context/AIProviderSettingsContext';
import type { AIProvider, UserProfile, AISettings } from '../types';
import { db } from '../db';
import { saveAs } from 'file-saver';
import { Button } from './Button';
import { DocumentArrowDownIcon, UploadIcon } from './Icons';
import { ADMIN_EMAILS } from '../config';


const AdminSettings: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [isExporting, setIsExporting] = React.useState(false);
    const [isImporting, setIsImporting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const handleExportDatabase = async () => {
        setIsExporting(true);
        try {
            const allData: { [key: string]: any[] } = {};
            for (const table of db.tables) {
                const tableData = await table.toArray();
                allData[table.name] = tableData;
            }
            const jsonString = JSON.stringify(allData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            saveAs(blob, `smartchalk_db_export_${new Date().toISOString().split('T')[0]}.json`);
        } catch (error) {
            console.error("Database export failed:", error);
            alert("Could not export the database. Check the console for more details.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("Are you sure you want to import this file? This will completely overwrite all existing data in the local database. This action cannot be undone.")) {
            return;
        }

        setIsImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            await db.transaction('rw', db.tables, async () => {
                for (const tableName in data) {
                    if (Object.prototype.hasOwnProperty.call(data, tableName)) {
                        const table = db.table(tableName);
                        await table.clear();
                        await table.bulkAdd(data[tableName]);
                    }
                }
            });

            alert("Database imported successfully! The page will now reload.");
            window.location.reload();

        } catch (error) {
            console.error("Database import failed:", error);
            alert(`Could not import the database. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset file input
            }
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mt-8">
            <h3 className="text-xl font-bold text-brand-navy mb-1">Admin Tools</h3>
            <p className="text-sm text-slate-500 mb-4">Manage your browser-local SmartChalk workspace. No server database is required in this standalone version.</p>
            
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-lg font-semibold text-brand-navy mb-2">Browser-local storage</h4>
                <p className="text-sm text-slate-600">Your saved content remains in this browser. Export a JSON backup before clearing browser data or moving to another device.</p>
            </div>

            {/* Admin Actions */}
            <div className="flex flex-wrap gap-4">
                <Button onClick={handleExportDatabase} isLoading={isExporting} variant="secondary">
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Export Full Database (JSON)
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} isLoading={isImporting} variant="secondary">
                    <UploadIcon className="h-5 w-5 mr-2" />
                    Import Database (JSON)
                </Button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleImportDatabase}
            />
            <p className="text-xs text-yellow-700 mt-3 bg-yellow-100 p-2 rounded-md">
                <strong>Warning:</strong> Importing will overwrite all existing local data.
            </p>
        </div>
    );
};

const SettingsContent: React.FC<{ user: UserProfile; isAdmin: boolean }> = ({ user, isAdmin }) => {
  const { settings, setSettings } = useAIProviderSettings();
  
  const handleSettingsChange = (newSettings: Partial<AISettings>) => {
    setSettings(newSettings);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-brand-navy mb-1">Text Generation</h3>
            <p className="text-sm text-slate-500 mb-4">Select and configure your primary AI provider for text-based tasks.</p>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1 mb-4">
                {(['gemini', 'openai', 'ollama'] as AIProvider[]).map((provider) => (
                    <button
                        key={provider}
                        onClick={() => handleSettingsChange({ provider })}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                            settings.provider === provider
                            ? 'bg-white text-green-700 shadow-sm'
                            : 'bg-transparent text-slate-600 hover:bg-white/60'
                        }`}
                    >
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </button>
                ))}
            </div>
            
             {settings.provider === 'gemini' && (
                <div>
                    <label htmlFor="gemini-key" className="text-sm font-medium text-slate-700 block mb-1.5">Google Gemini API Key</label>
                    <input
                        id="gemini-key"
                        type="password"
                        placeholder="Enter your Gemini API key"
                        value={settings.geminiApiKey}
                        onChange={(e) => handleSettingsChange({ geminiApiKey: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-shadow duration-200 text-sm"
                    />
                </div>
            )}

            {settings.provider === 'openai' && (
                <div>
                    <label htmlFor="openai-key" className="text-sm font-medium text-slate-700 block mb-1.5">OpenAI API Key</label>
                    <input
                        id="openai-key"
                        type="password"
                        placeholder="sk-..."
                        value={settings.openAIKey}
                        onChange={(e) => handleSettingsChange({ openAIKey: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-shadow duration-200 text-sm"
                    />
                </div>
            )}
            
            {settings.provider === 'ollama' && (
                <div className="space-y-3">
                    <div>
                        <label htmlFor="ollama-url" className="text-sm font-medium text-slate-700 block mb-1.5">Ollama URL</label>
                        <input
                            id="ollama-url"
                            type="text"
                            placeholder="http://localhost:11434"
                            value={settings.ollamaUrl}
                            onChange={(e) => handleSettingsChange({ ollamaUrl: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-shadow duration-200 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="ollama-model" className="text-sm font-medium text-slate-700 block mb-1.5">Model Name</label>
                        <input
                            id="ollama-model"
                            type="text"
                            placeholder="e.g., llama3, mistral"
                            value={settings.ollamaModel}
                            onChange={(e) => handleSettingsChange({ ollamaModel: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-green focus:border-brand-green transition-shadow duration-200 text-sm"
                        />
                    </div>
                </div>
            )}
        </div>
        {isAdmin && <AdminSettings user={user} />}
    </div>
  );
};


interface SettingsViewProps {
    user: UserProfile;
    isAdmin: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, isAdmin }) => {
    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-left mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-brand-navy">Settings</h1>
                    <p className="text-lg text-slate-600 mt-1">Manage application and AI provider configurations.</p>
                </div>
                <SettingsContent user={user} isAdmin={isAdmin} />
            </div>
        </main>
    );
};