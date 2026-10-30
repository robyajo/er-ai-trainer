import {
  getModelInfo,
  getOllamaModels,
  saveProjectRules,
  scanProject,
  selectFolder,
  testModel,
  trainModel,
} from "./handlers";

export const trainer = {
  selectFolder,
  getOllamaModels,
  getModelInfo,
  scanProject,
  trainModel,
  saveProjectRules,
  testModel,
};
