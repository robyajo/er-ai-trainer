import { z } from "zod";

export const scanProjectInputSchema = z.object({
  projectPath: z.string().min(1),
});

export const getModelInfoInputSchema = z.object({
  modelName: z.string().min(1),
});

export const pullOllamaModelInputSchema = z.object({
  modelName: z.string().min(1),
});

export const deleteOllamaModelInputSchema = z.object({
  modelName: z.string().min(1),
});

export const getOllamaPublicKeyInputSchema = z.object({}).optional();

export const pushOllamaModelInputSchema = z.object({
  sourceModel: z.string().min(1),
  targetModel: z.string().min(1),
});

export const exportModelfileInputSchema = z.object({
  modelName: z.string().min(1),
});

export const saveModelfileToDiskInputSchema = z.object({
  modelName: z.string().min(1),
  content: z.string().min(1),
});

export const trainModelInputSchema = z.object({
  newModelName: z.string().min(1),
  baseModel: z.string().min(1),
  systemPrompt: z.string().min(1),
  temperature: z.number().default(0.3),
  contextLength: z.number().default(32768),
  saveLocalModelfile: z.boolean().default(true),
  projectPath: z.string().optional(),
});

export const saveProjectRulesInputSchema = z.object({
  projectPath: z.string().min(1),
  rulesContent: z.string().min(1),
});

export const testModelInputSchema = z.object({
  modelName: z.string().min(1),
  testPrompt: z.string().optional(),
});

export const chatWithModelInputSchema = z.object({
  modelName: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
      images: z.array(z.string()).optional(),
    })
  ),
  temperature: z.number().default(0.3),
});

export const getOpenCodeStatusInputSchema = z.object({}).optional();

export const runOpenCodePromptInputSchema = z.object({
  modelName: z.string().default("opencode/nemotron-3.5-lightning-free"),
  prompt: z.string().min(1),
  projectPath: z.string().optional(),
});

export const addProjectsToQueueInputSchema = z.object({
  paths: z.array(z.string().min(1)),
});

export const toggleIgnoreProjectInputSchema = z.object({
  projectPath: z.string().min(1),
  isIgnored: z.boolean(),
});

export const deleteProjectFromQueueInputSchema = z.object({
  projectPath: z.string().min(1),
});

export const processSingleProjectTrainingInputSchema = z.object({
  projectPath: z.string().min(1),
  baseModel: z.string().default("qwen2.5-coder:3b"),
  targetModelName: z.string().optional(),
  analysisEngine: z.enum(["ollama", "opencode"]).default("ollama"),
  opencodeModel: z.string().default("opencode/nemotron-3.5-lightning-free"),
  templateId: z.string().default("fullstack"),
  temperature: z.number().default(0.3),
  contextLength: z.number().default(32768),
  customSystemPrompt: z.string().optional(),
});
