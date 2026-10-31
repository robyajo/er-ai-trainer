import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

let dbInstance: DatabaseSync | null = null;

export interface ProjectRecord {
  id?: number;
  project_path: string;
  project_name: string;
  target_model_name: string;
  base_model: string;
  status: "pending" | "training" | "completed" | "ignored" | "failed";
  tech_stack: string; // JSON string
  frameworks: string; // JSON string
  summary: string;
  system_prompt: string;
  ai_analysis: string;
  tokens_per_sec: number;
  duration_ms: number;
  is_ignored: number; // 0 or 1
  trained_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  let userDataPath: string;
  try {
    userDataPath = app.getPath("userData");
  } catch {
    userDataPath = path.join(process.cwd(), ".er-ai-data");
  }

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = path.join(userDataPath, "er_ai_trainer.sqlite");
  dbInstance = new DatabaseSync(dbPath);

  // Initialize schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS trained_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT UNIQUE NOT NULL,
      project_name TEXT NOT NULL,
      target_model_name TEXT NOT NULL,
      base_model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      tech_stack TEXT DEFAULT '[]',
      frameworks TEXT DEFAULT '[]',
      summary TEXT DEFAULT '',
      system_prompt TEXT DEFAULT '',
      ai_analysis TEXT DEFAULT '',
      tokens_per_sec REAL DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      is_ignored INTEGER DEFAULT 0,
      trained_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_project_path ON trained_projects (project_path);
  `);

  return dbInstance;
}

export function getAllProjects(): ProjectRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM trained_projects ORDER BY is_ignored ASC, (status = 'completed') ASC, updated_at DESC"
  );
  return stmt.all() as unknown as ProjectRecord[];
}

export function getProjectByPath(projectPath: string): ProjectRecord | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM trained_projects WHERE project_path = ?");
  const row = stmt.get(projectPath);
  return (row as unknown as ProjectRecord) || null;
}

export function upsertProject(data: {
  project_path: string;
  project_name: string;
  target_model_name?: string;
  base_model?: string;
  status?: string;
  tech_stack?: string[];
  frameworks?: string[];
  summary?: string;
  system_prompt?: string;
  ai_analysis?: string;
  tokens_per_sec?: number;
  duration_ms?: number;
  is_ignored?: number;
  trained_at?: string | null;
}): ProjectRecord {
  const db = getDatabase();
  const existing = getProjectByPath(data.project_path);

  const now = new Date().toISOString();
  const techStackJson = JSON.stringify(data.tech_stack || []);
  const frameworksJson = JSON.stringify(data.frameworks || []);

  if (existing) {
    const stmt = db.prepare(`
      UPDATE trained_projects SET
        project_name = coalesce(?, project_name),
        target_model_name = coalesce(?, target_model_name),
        base_model = coalesce(?, base_model),
        status = coalesce(?, status),
        tech_stack = coalesce(?, tech_stack),
        frameworks = coalesce(?, frameworks),
        summary = coalesce(?, summary),
        system_prompt = coalesce(?, system_prompt),
        ai_analysis = coalesce(?, ai_analysis),
        tokens_per_sec = coalesce(?, tokens_per_sec),
        duration_ms = coalesce(?, duration_ms),
        is_ignored = coalesce(?, is_ignored),
        trained_at = coalesce(?, trained_at),
        updated_at = ?
      WHERE project_path = ?
    `);

    stmt.run(
      data.project_name || existing.project_name,
      data.target_model_name || existing.target_model_name,
      data.base_model || existing.base_model,
      data.status || existing.status,
      techStackJson,
      frameworksJson,
      data.summary || existing.summary,
      data.system_prompt || existing.system_prompt,
      data.ai_analysis || existing.ai_analysis,
      data.tokens_per_sec !== undefined ? data.tokens_per_sec : existing.tokens_per_sec,
      data.duration_ms !== undefined ? data.duration_ms : existing.duration_ms,
      data.is_ignored !== undefined ? data.is_ignored : existing.is_ignored,
      data.trained_at !== undefined ? data.trained_at : existing.trained_at,
      now,
      data.project_path
    );
  } else {
    const stmt = db.prepare(`
      INSERT INTO trained_projects (
        project_path, project_name, target_model_name, base_model,
        status, tech_stack, frameworks, summary, system_prompt,
        ai_analysis, tokens_per_sec, duration_ms, is_ignored, trained_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.project_path,
      data.project_name,
      data.target_model_name || "er-ai-code:v1.0",
      data.base_model || "qwen2.5-coder:3b",
      data.status || "pending",
      techStackJson,
      frameworksJson,
      data.summary || "",
      data.system_prompt || "",
      data.ai_analysis || "",
      data.tokens_per_sec || 0,
      data.duration_ms || 0,
      data.is_ignored || 0,
      data.trained_at || null,
      now,
      now
    );
  }

  return getProjectByPath(data.project_path)!;
}

export function toggleIgnoreProject(projectPath: string, isIgnored: boolean): ProjectRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE trained_projects SET
      is_ignored = ?,
      updated_at = ?
    WHERE project_path = ?
  `);
  stmt.run(isIgnored ? 1 : 0, new Date().toISOString(), projectPath);
  return getAllProjects();
}

export function deleteProjectFromDb(projectPath: string): ProjectRecord[] {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM trained_projects WHERE project_path = ?");
  stmt.run(projectPath);
  return getAllProjects();
}
