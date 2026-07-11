import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

const PROJECTS_DIR = FileSystem.documentDirectory + 'projects/';

export async function ensureProjectsDir() {
  const dirInfo = await FileSystem.getInfoAsync(PROJECTS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PROJECTS_DIR, { intermediates: true });
  }
}

export async function createProjectDir(projectId) {
  await ensureProjectsDir();
  const projectDir = PROJECTS_DIR + projectId + '/';
  await FileSystem.makeDirectoryAsync(projectDir, { intermediates: true });
  await FileSystem.makeDirectoryAsync(projectDir + 'pages/', { intermediates: true });
  return projectDir;
}

export async function copyImageToProject(sourceUri, projectId, pageIndex) {
  const ext = sourceUri.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const cleanExt = ext.match(/^(jpg|jpeg|png|webp)$/) ? ext : 'jpg';
  const fileName = `page_${pageIndex}.${cleanExt}`;
  const projectDir = PROJECTS_DIR + projectId + '/';
  const destUri = projectDir + 'pages/' + fileName;
  
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return destUri;
}

export async function deleteProjectDir(projectId) {
  const projectDir = PROJECTS_DIR + projectId + '/';
  const dirInfo = await FileSystem.getInfoAsync(projectDir);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(projectDir, { idempotent: true });
  }
}

export async function getImageDimensions(uri) {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(uri, [], {});
    return { width: manipulated.width, height: manipulated.height };
  } catch {
    return { width: 0, height: 0 };
  }
}

export async function saveExportedImage(uri, fileName) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission denied to save to gallery');
  }
  const asset = await MediaLibrary.createAssetAsync(uri);
  await MediaLibrary.createAlbumAsync('Studio Exports', asset, false);
  return asset;
}

export async function fileExists(uri) {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export async function deleteFile(uri) {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {
    console.warn('Failed to delete file:', e);
  }
}

export async function readTextFile(uri) {
  try {
    return await FileSystem.readAsStringAsync(uri);
  } catch (e) {
    throw new Error('Failed to read file: ' + e.message);
  }
}