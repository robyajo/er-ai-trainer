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
  templateId?: string;
  temperature?: number;
  contextLength?: number;
  customSystemPrompt?: string;
}) {
  return await ipc.client.trainer.processSingleProjectTraining(params);
}
