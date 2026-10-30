import { z } from "zod";

export const scanProjectInputSchema = z.object({
  projectPath: z.string().min(1),
});

export const getModelInfoInputSchema = z.object({
  modelName: z.string().min(1),
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
