/**
 * Model definitions and metadata for Prive
 */

export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  strengths: string[];
  recommended: boolean;
}

export const MODELS: ModelDefinition[] = [
  {
    id: 'qwen2.5-coder',
    name: 'Qwen 2.5 Coder',
    description: 'Alibaba\'s specialized coding model, excellent for code generation and analysis',
    contextWindow: 32_768,
    strengths: ['code generation', 'code review', 'debugging', 'refactoring'],
    recommended: true,
  },
  {
    id: 'qwen2.5-coder:7b',
    name: 'Qwen 2.5 Coder 7B',
    description: 'Lighter Qwen coder variant, good performance on modest hardware',
    contextWindow: 32_768,
    strengths: ['code generation', 'fast inference'],
    recommended: false,
  },
  {
    id: 'deepseek-coder-v2',
    name: 'DeepSeek Coder V2',
    description: 'DeepSeek\'s advanced coding model with strong multi-language support',
    contextWindow: 65_536,
    strengths: ['code generation', 'architecture', 'algorithms', 'multi-language'],
    recommended: true,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: 'DeepSeek reasoning model, great for complex problem solving',
    contextWindow: 32_768,
    strengths: ['reasoning', 'debugging', 'architecture design'],
    recommended: false,
  },
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    description: 'Meta\'s general-purpose model, solid for all tasks',
    contextWindow: 8_192,
    strengths: ['general coding', 'explanation', 'documentation'],
    recommended: false,
  },
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    description: 'Lightweight Llama model for resource-constrained machines',
    contextWindow: 8_192,
    strengths: ['fast inference', 'general tasks'],
    recommended: false,
  },
  {
    id: 'codellama',
    name: 'Code Llama',
    description: 'Meta\'s dedicated coding model based on Llama',
    contextWindow: 16_384,
    strengths: ['code completion', 'code generation'],
    recommended: false,
  },
  {
    id: 'mistral',
    name: 'Mistral 7B',
    description: 'Mistral AI\'s efficient general model',
    contextWindow: 8_192,
    strengths: ['general coding', 'explanation'],
    recommended: false,
  },
];

/**
 * Get model definition by ID
 */
export function getModelById(id: string): ModelDefinition | undefined {
  return MODELS.find(m => m.id === id || m.id.startsWith(id));
}

/**
 * Get recommended models
 */
export function getRecommendedModels(): ModelDefinition[] {
  return MODELS.filter(m => m.recommended);
}

/**
 * Get all model IDs
 */
export function getModelIds(): string[] {
  return MODELS.map(m => m.id);
}
