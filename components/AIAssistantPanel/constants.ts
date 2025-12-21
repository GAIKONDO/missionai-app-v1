import type { ModelInfo } from './types';

export const GPT_MODELS: ModelInfo[] = [
  { value: 'gpt-5.1', label: 'gpt-5.1', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5', label: 'gpt-5', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5-mini', label: 'gpt-5-mini', inputPrice: '$0.25', outputPrice: '$2.00' },
  { value: 'gpt-5-nano', label: 'gpt-5-nano', inputPrice: '$0.05', outputPrice: '$0.40' },
  { value: 'gpt-5.1-chat-latest', label: 'gpt-5.1-chat-latest', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5-chat-latest', label: 'gpt-5-chat-latest', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5.1-codex', label: 'gpt-5.1-codex', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5-codex', label: 'gpt-5-codex', inputPrice: '$1.25', outputPrice: '$10.00' },
  { value: 'gpt-5-pro', label: 'gpt-5-pro', inputPrice: '$15.00', outputPrice: '$120.00' },
  { value: 'gpt-4.1', label: 'gpt-4.1', inputPrice: '$2.00', outputPrice: '$8.00' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini', inputPrice: '$0.40', outputPrice: '$1.60' },
  { value: 'gpt-4.1-nano', label: 'gpt-4.1-nano', inputPrice: '$0.10', outputPrice: '$0.40' },
  { value: 'gpt-4o', label: 'gpt-4o', inputPrice: '$2.50', outputPrice: '$10.00' },
];

export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'gpt-5.1': { input: 1.25, output: 10.00 },
  'gpt-5': { input: 1.25, output: 10.00 },
  'gpt-5-mini': { input: 0.25, output: 2.00 },
  'gpt-5-nano': { input: 0.05, output: 0.40 },
  'gpt-5.1-chat-latest': { input: 1.25, output: 10.00 },
  'gpt-5-chat-latest': { input: 1.25, output: 10.00 },
  'gpt-5.1-codex': { input: 1.25, output: 10.00 },
  'gpt-5-codex': { input: 1.25, output: 10.00 },
  'gpt-5-pro': { input: 15.00, output: 120.00 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1-nano': { input: 0.10, output: 0.40 },
  'gpt-4o': { input: 2.50, output: 10.00 },
};

export const DEFAULT_MODEL = 'gpt-4.1-mini';
export const DEFAULT_MODEL_TYPE: 'gpt' | 'local' | 'cursor' = 'gpt';
export const DEFAULT_PANEL_WIDTH = 480;
export const MIN_PANEL_WIDTH = 320;
export const MAX_PANEL_WIDTH = 1200;

