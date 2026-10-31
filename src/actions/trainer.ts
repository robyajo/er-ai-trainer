import { ipc } from "@/ipc/manager";
import type { ProjectAnalysis } from "@/ipc/trainer/handlers";
import type { ProjectRecord } from "@/ipc/db/database";

export async function selectFolder() {
  return await ipc.client.trainer.selectFolder();
}

export async function selectMultipleFolders() {
  return await ipc.client.trainer.selectMultipleFolders();
}

export async function getOllamaModels() {
  return await ipc.client.trainer.getOllamaModels();
}

export async function pullOllamaModel(modelName: string) {
  return await ipc.client.trainer.pullOllamaModel({ modelName });
}

export async function deleteOllamaModel(modelName: string) {
  return await ipc.client.trainer.deleteOllamaModel({ modelName });
}

export async function getOllamaPublicKey() {
  return await ipc.client.trainer.getOllamaPublicKey();
}

export async function pushOllamaModel(params: {
  sourceModel: string;
  targetModel: string;
}) {
  return await ipc.client.trainer.pushOllamaModel(params);
}

export async function exportModelfile(modelName: string) {
  return await ipc.client.trainer.exportModelfile({ modelName });
}

export async function saveModelfileToDisk(params: {
  modelName: string;
  content: string;
}) {
  return await ipc.client.trainer.saveModelfileToDisk(params);
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

export async function chatWithModel(params: {
  modelName: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string; images?: string[] }>;
  temperature?: number;
}) {
  return await ipc.client.trainer.chatWithModel(params);
}

export async function getOpenCodeStatus() {
  return await ipc.client.trainer.getOpenCodeStatus();
}

export async function runOpenCodePrompt(params: {
  modelName: string;
  prompt: string;
  projectPath?: string;
}) {
  return await ipc.client.trainer.runOpenCodePrompt(params);
}

export async function getProjectQueue(): Promise<ProjectRecord[]> {
  return (await ipc.client.trainer.getProjectQueue()) as unknown as ProjectRecord[];
}

export async function addProjectsToQueue(paths: string[]): Promise<ProjectRecord[]> {
  return (await ipc.client.trainer.addProjectsToQueue({ paths })) as unknown as ProjectRecord[];
}

export async function toggleIgnoreProject(projectPath: string, isIgnored: boolean): Promise<ProjectRecord[]> {
  return (await ipc.client.trainer.toggleIgnoreProject({ projectPath, isIgnored })) as unknown as ProjectRecord[];
}

export async function deleteProjectFromQueue(projectPath: string): Promise<ProjectRecord[]> {
  return (await ipc.client.trainer.deleteProjectFromQueue({ projectPath })) as unknown as ProjectRecord[];
}

export async function processSingleProjectTraining(params: {
  projectPath: string;
  baseModel?: string;
  targetModelName?: string;
  analysisEngine?: "ollama" | "opencode";
  opencodeModel?: string;
  templateId?: string;
  temperature?: number;
  contextLength?: number;
  customSystemPrompt?: string;
}) {
  return await ipc.client.trainer.processSingleProjectTraining(params);
}
