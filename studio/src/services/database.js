import * as SQLite from 'expo-sqlite';

let db = null;

export async function initDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('studio.db');
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      cover_page_index INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      original_image_uri TEXT NOT NULL,
      original_width INTEGER DEFAULT 0,
      original_height INTEGER DEFAULT 0,
      status TEXT DEFAULT 'not_started',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS layers (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      type TEXT NOT NULL,
      visible INTEGER DEFAULT 1,
      locked INTEGER DEFAULT 0,
      data TEXT NOT NULL,
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS dialogues (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_placed INTEGER DEFAULT 0,
      placed_on_page_id TEXT,
      placed_layer_id TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  
  return db;
}

export async function createProject(project) {
  const database = await initDatabase();
  await database.runAsync(
    'INSERT INTO projects (id, name, created_at, updated_at, cover_page_index) VALUES (?, ?, ?, ?, ?)',
    [project.id, project.name, project.createdAt, project.updatedAt, project.coverPageIndex || 0]
  );
  return project;
}

export async function getAllProjects() {
  const database = await initDatabase();
  return await database.getAllAsync('SELECT * FROM projects ORDER BY updated_at DESC');
}

export async function getProjectById(projectId) {
  const database = await initDatabase();
  const result = await database.getAllAsync('SELECT * FROM projects WHERE id = ?', [projectId]);
  return result[0] || null;
}

export async function updateProject(projectId, updates) {
  const database = await initDatabase();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), projectId];
  await database.runAsync(`UPDATE projects SET ${fields} WHERE id = ?`, values);
}

export async function deleteProject(projectId) {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM projects WHERE id = ?', [projectId]);
}

export async function createPage(page) {
  const database = await initDatabase();
  await database.runAsync(
    'INSERT INTO pages (id, project_id, idx, original_image_uri, original_width, original_height, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [page.id, page.projectId, page.index, page.originalImageUri, page.originalWidth || 0, page.originalHeight || 0, page.status || 'not_started']
  );
  return page;
}

export async function getPagesByProjectId(projectId) {
  const database = await initDatabase();
  return await database.getAllAsync('SELECT * FROM pages WHERE project_id = ? ORDER BY idx', [projectId]);
}

export async function getPageById(pageId) {
  const database = await initDatabase();
  const result = await database.getAllAsync('SELECT * FROM pages WHERE id = ?', [pageId]);
  return result[0] || null;
}

export async function updatePage(pageId, updates) {
  const database = await initDatabase();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), pageId];
  await database.runAsync(`UPDATE pages SET ${fields} WHERE id = ?`, values);
}

export async function deletePage(pageId) {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM pages WHERE id = ?', [pageId]);
}

export async function createLayer(layer) {
  const database = await initDatabase();
  await database.runAsync(
    'INSERT INTO layers (id, page_id, idx, type, visible, locked, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [layer.id, layer.pageId, layer.index, layer.type, layer.visible ? 1 : 0, layer.locked ? 1 : 0, JSON.stringify(layer.data)]
  );
  return layer;
}

export async function getLayersByPageId(pageId) {
  const database = await initDatabase();
  const rows = await database.getAllAsync('SELECT * FROM layers WHERE page_id = ? ORDER BY idx', [pageId]);
  return rows.map(r => ({ ...r, visible: !!r.visible, locked: !!r.locked, data: JSON.parse(r.data) }));
}

export async function updateLayer(layerId, updates) {
  const database = await initDatabase();
  const fields = [];
  const values = [];
  Object.entries(updates).forEach(([k, v]) => {
    fields.push(`${k} = ?`);
    values.push(k === 'data' ? JSON.stringify(v) : v);
  });
  values.push(layerId);
  await database.runAsync(`UPDATE layers SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteLayer(layerId) {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM layers WHERE id = ?', [layerId]);
}

export async function createDialogue(dialogue) {
  const database = await initDatabase();
  await database.runAsync(
    'INSERT INTO dialogues (id, project_id, idx, content, is_placed, placed_on_page_id, placed_layer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [dialogue.id, dialogue.projectId, dialogue.index, dialogue.content, dialogue.isPlaced ? 1 : 0, dialogue.placedOnPageId || null, dialogue.placedLayerId || null]
  );
  return dialogue;
}

export async function getDialoguesByProjectId(projectId) {
  const database = await initDatabase();
  const rows = await database.getAllAsync('SELECT * FROM dialogues WHERE project_id = ? ORDER BY idx', [projectId]);
  return rows.map(r => ({ ...r, isPlaced: !!r.is_placed }));
}

export async function updateDialogue(dialogueId, updates) {
  const database = await initDatabase();
  const fields = [];
  const values = [];
  Object.entries(updates).forEach(([k, v]) => {
    fields.push(`${k} = ?`);
    values.push(v);
  });
  values.push(dialogueId);
  await database.runAsync(`UPDATE dialogues SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteDialoguesByProjectId(projectId) {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM dialogues WHERE project_id = ?', [projectId]);
}

export async function setSetting(key, value) {
  const database = await initDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, typeof value === 'string' ? value : JSON.stringify(value)]
  );
}

export async function getSetting(key, defaultValue) {
  const database = await initDatabase();
  const result = await database.getAllAsync('SELECT value FROM settings WHERE key = ?', [key]);
  if (result.length === 0) return defaultValue;
  try {
    return JSON.parse(result[0].value);
  } catch {
    return result[0].value;
  }
}