import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV1 } from 'ai';

export type AIProviderName = 'google' | 'openai' | 'anthropic';

// Initialize provider instances
function getGoogleProvider() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  return createGoogleGenerativeAI({
    apiKey,
  });
}

function getOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY || '';
  return createOpenAI({
    apiKey,
  });
}

function getAnthropicProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  return createAnthropic({
    apiKey,
  });
}

/**
 * Returns the configured LanguageModel for in-depth knowledge synthesis.
 * Controlled by AI_SYNTHESIS_PROVIDER and AI_SYNTHESIS_MODEL.
 */
export function getSynthesisModel(): LanguageModelV1 {
  const providerName = (process.env.AI_SYNTHESIS_PROVIDER || 'google').toLowerCase() as AIProviderName;
  const modelName = process.env.AI_SYNTHESIS_MODEL || 'gemini-1.5-pro';

  switch (providerName) {
    case 'openai': {
      const openai = getOpenAIProvider();
      return openai(modelName);
    }
    case 'anthropic': {
      const anthropic = getAnthropicProvider();
      return anthropic(modelName);
    }
    case 'google':
    default: {
      const google = getGoogleProvider();
      return google(modelName);
    }
  }
}

/**
 * Returns the configured LanguageModel for visual analysis & bounding box extraction.
 * Controlled by AI_VISION_PROVIDER and AI_VISION_MODEL.
 * Defaults to Google Gemini Flash which excels at normalized 0-1000 box_2d coordinate detection.
 */
export function getVisionModel(): LanguageModelV1 {
  const providerName = (process.env.AI_VISION_PROVIDER || 'google').toLowerCase() as AIProviderName;
  const modelName = process.env.AI_VISION_MODEL || 'gemini-1.5-flash';

  switch (providerName) {
    case 'openai': {
      const openai = getOpenAIProvider();
      return openai(modelName);
    }
    case 'anthropic': {
      const anthropic = getAnthropicProvider();
      return anthropic(modelName);
    }
    case 'google':
    default: {
      const google = getGoogleProvider();
      return google(modelName);
    }
  }
}

/**
 * Check if the active provider has an API key configured.
 */
export function checkAIConfig() {
  const synthesisProvider = (process.env.AI_SYNTHESIS_PROVIDER || 'google').toLowerCase() as AIProviderName;
  const synthesisModel = process.env.AI_SYNTHESIS_MODEL || 'gemini-2.5-pro';
  const visionProvider = (process.env.AI_VISION_PROVIDER || 'google').toLowerCase() as AIProviderName;
  const visionModel = process.env.AI_VISION_MODEL || 'gemini-2.5-flash';

  const hasGoogleKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  let isConfigured = false;
  if (synthesisProvider === 'google' && hasGoogleKey) isConfigured = true;
  if (synthesisProvider === 'openai' && hasOpenAIKey) isConfigured = true;
  if (synthesisProvider === 'anthropic' && hasAnthropicKey) isConfigured = true;

  return {
    synthesisProvider,
    synthesisModel,
    visionProvider,
    visionModel,
    isConfigured,
    hasGoogleKey,
    hasOpenAIKey,
    hasAnthropicKey,
  };
}
