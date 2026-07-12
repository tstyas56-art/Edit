import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// مفتاح التخزين الوحيد
const PROJECTS_KEY = '@studio_projects';

// هيكل المشروع
// {
//   id: string,
//   title: string,
//   pages: [
//     { imageUri: string, width: number, height: number }
//   ],
//   createdAt: number
// }

// قراءة كل المشاريع
async function readProjects() {
  const json = await AsyncStorage.getItem(PROJECTS_KEY);
  return json ? JSON.parse(json) : [];
}

// حفظ كل المشاريع
async function writeProjects(projects) {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// لا حاجة لمجلدات، نعيد فقط شيئاً وهمياً للتوافق
export async function ensureProjectsDir() {
  // لا شيء
}

export async function createProjectDir(projectId) {
  // لا شيء، فقط نعيد مساراً وهمياً (لن يستخدم فعلياً)
  return 'project_' + projectId + '/';
}

// إضافة صفحة إلى مشروع (نخزن البيانات فقط)
export async function copyImageToProject(sourceUri, projectId, pageIndex) {
  const projects = await readProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  // نضيف الصفحة
  project.pages[pageIndex] = {
    imageUri: sourceUri,  // نبقي المسار الأصلي
    width: 0,
    height: 0,
  };
  await writeProjects(projects);
  return sourceUri; // نرجع المسار الأصلي
}

export async function deleteProjectDir(projectId) {
  let projects = await readProjects();
  projects = projects.filter(p => p.id !== projectId);
  await writeProjects(projects);
}

// دالة للحصول على أبعاد الصورة بدون ImageManipulator (بسيطة)
export async function getImageDimensions(uri) {
  // يمكن استخدام Image.getSize لكن React Native Web قد لا يدعمها.
  // نعيد أبعاداً افتراضية، أو نحاول استخدام Image.resolveAssetSource.
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = uri;
  });
}

// حفظ صورة إلى الألبوم أو مشاركتها
export async function saveExportedImage(uri, fileName) {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Studio Exports', asset, false);
      return asset;
    }
  } catch (e) {
    // fallback to sharing
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
    return { uri };
  }
  throw new Error('No method to save image');
}

export async function fileExists(uri) {
  // لا نستطيع التحقق على الويب، نفترض أنه موجود
  return true;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export async function deleteFile(uri) {
  // لا شيء
}

export async function readTextFile(uri) {
  // قراءة من AsyncStorage بدلاً من ملف
  const projects = await readProjects();
  // نبحث في المشاريع عن نص مرتبط بـ uri (هذا يحتاج بنية مختلفة)
  // غير مستخدم غالباً، نعيد سلسلة فارغة
  return '';
}

// دوال إضافية لإدارة المشاريع
export async function createProject(projectId, title) {
  const projects = await readProjects();
  projects.push({
    id: projectId,
    title: title || 'Untitled',
    pages: [],
    createdAt: Date.now(),
  });
  await writeProjects(projects);
}

export async function getProject(projectId) {
  const projects = await readProjects();
  return projects.find(p => p.id === projectId) || null;
}

export async function updateProject(projectId, updates) {
  const projects = await readProjects();
  const index = projects.findIndex(p => p.id === projectId);
  if (index === -1) return;
  projects[index] = { ...projects[index], ...updates };
  await writeProjects(projects);
}

export async function deleteProject(projectId) {
  await deleteProjectDir(projectId);
}
