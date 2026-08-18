import type { AIProvider } from '../types';
import { PROVIDER_ENDPOINT_DEFAULTS } from '../context/AIProviderSettingsContext';

export interface ModelDiscoveryRequest {
  provider: AIProvider;
  endpoint?: string;
  apiKey?: string;
  customEndpoint?: string;
}

export interface DiscoveredModel {
  id: string;
  label: string;
  provider: AIProvider;
  isFree: boolean;
}

const withBase = (endpoint: string, path: string) => {
  const base = endpoint.replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

const hasFreePricing = (record: Record<string, unknown>, id: string, label: string): boolean => {
  if (/\bfree\b/i.test(`${id} ${label}`)) return true;
  if (record.free === true || record.is_free === true || record.isFree === true) return true;

  const pricing = record.pricing;
  if (!pricing || typeof pricing !== 'object') return false;
  const rates = Object.values(pricing as Record<string, unknown>)
    .filter(value => typeof value === 'string' || typeof value === 'number')
    .map(value => Number(value));
  return rates.length > 0 && rates.every(rate => Number.isFinite(rate) && rate === 0);
};

const parseModels = (payload: unknown, provider: AIProvider): DiscoveredModel[] => {
  const candidates = Array.isArray(payload)
    ? payload
    : typeof payload === 'object' && payload !== null
      ? ((payload as { data?: unknown[]; models?: unknown[] }).data ?? (payload as { models?: unknown[] }).models ?? [])
      : [];

  return candidates
    .map((item) => {
      if (typeof item === 'string') return { id: item, label: item, provider, isFree: /\bfree\b/i.test(item) };
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = String(record.id ?? record.name ?? record.model ?? '').trim();
      if (!id) return null;
      const label = String(record.displayName ?? record.name ?? record.id ?? record.model ?? id).trim();
      return { id, label, provider, isFree: hasFreePricing(record, id, label) };
    })
    .filter((model): model is DiscoveredModel => Boolean(model));
};

const headersFor = (apiKey: string | undefined) => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  return headers;
};

export async function discoverModels(request: ModelDiscoveryRequest): Promise<DiscoveredModel[]> {
  const endpoint = (request.endpoint || request.customEndpoint || PROVIDER_ENDPOINT_DEFAULTS[request.provider] || '').trim();
  if (!endpoint) throw new Error('Enter an endpoint before testing model discovery.');

  let url = withBase(endpoint, '/models');
  const headers = headersFor(request.apiKey);

  if (request.provider === 'gemini') {
    url = withBase(endpoint, '/models');
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}key=${encodeURIComponent(request.apiKey ?? '')}`;
    delete headers.Authorization;
  } else if (request.provider === 'ollama' || request.provider === 'cloudOllama') {
    url = withBase(endpoint, '/api/tags');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && 'error' in payload ? String((payload as { error: unknown }).error) : response.statusText;
      throw new Error(`${response.status} ${detail}`.trim());
    }

    let models = parseModels(payload, request.provider);
    if (request.provider === 'openRouter' || request.provider === 'nous') {
      models = models.filter(model => model.isFree);
    }
    return models;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The model endpoint timed out after 12 seconds. Check the URL and that the service is reachable.');
    }
    if (error instanceof TypeError) {
      throw new Error('The browser could not reach this endpoint. Check CORS, the URL, and whether the service is running.');
    }
    throw error instanceof Error ? error : new Error('Model discovery failed.');
  } finally {
    window.clearTimeout(timeout);
  }
}
