import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AIProviderSettingsProvider } from './context/AIProviderSettingsContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from './config';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LanguageProvider>
        <AIProviderSettingsProvider>
          <App />
        </AIProviderSettingsProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
