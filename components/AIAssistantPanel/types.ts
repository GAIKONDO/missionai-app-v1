export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export interface ModelInfo {
  value: string;
  label: string;
  inputPrice: string;
  outputPrice: string;
}

export type ModelType = 'gpt' | 'local' | 'cursor';

export interface RAGSource {
  type: 'entity' | 'relation' | 'topic';
  id: string;
  name: string;
  score: number;
}

