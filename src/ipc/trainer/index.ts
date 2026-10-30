import {
  getModelInfo,
  getOllamaModels,
  saveProjectRules,
  scanProject,
  selectFolder,
  trainModel,
} from "./handlers";

export const trainer = {
  selectFolder,
  getOllamaModels,
  getModelInfo,
  scanProject,
  trainModel,
  saveProjectRules,
};
