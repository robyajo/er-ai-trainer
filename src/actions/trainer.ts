import { ipc } from "@/ipc/manager";
import type { ProjectAnalysis } from "@/ipc/trainer/handlers";

export async function selectFolder() {
  return await ipc.client.trainer.selectFolder();
}

export async function getOllamaModels() {
  return await ipc.client.trainer.getOllamaModels();
}

export async function getModelInfo(modelName: string) {
  return await ipc.client.trainer.getModelInfo({ modelName });
}

export async function scanProject(projectPath: string): Promise<ProjectAnalysis> {
  return await ipc.client.trainer.scanProject({ projectPath });
}

export async function trainModel(params: {
  newModelName: string;
  baseModel: string;
  systemPrompt: string;
  temperature?: number;
  contextLength?: number;
  saveLocalModelfile?: boolean;
  projectPath?: string;
}) {
  return await ipc.client.trainer.trainModel(params);
}

export async function saveProjectRules(projectPath: string, rulesContent: string) {
  return await ipc.client.trainer.saveProjectRules({ projectPath, rulesContent });
}

export async function testModel(modelName: string, testPrompt?: string) {
  return await ipc.client.trainer.testModel({ modelName, testPrompt });
}
