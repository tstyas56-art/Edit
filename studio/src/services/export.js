import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getPageById, getLayersByPageId } from './database';
import { saveExportedImage } from './storage';
import { isArabicText } from './parser';

export async function exportPage(pageId, options = {}) {
  const page = await getPageById(pageId);
  if (!page) throw new Error('الصفحة غير موجودة');
  
  const layers = await getLayersByPageId(pageId);
  const visibleLayers = layers.filter(l => l.visible && l.type !== 'base');
  
  let resultUri = page.original_image_uri;
  
  if (visibleLayers.length > 0) {
    const textOverlays = visibleLayers
      .filter(l => l.type === 'text')
      .map(l => {
        const d = l.data;
        const isAr = isArabicText(d.content);
        return {
          type: 'text',
          text: d.content,
          x: Math.round(d.x * page.original_width),
          y: Math.round(d.y * page.original_height),
          fontSize: d.fontSize || 20,
          color: '#FFFFFF',
          textAlign: d.alignment || (isAr ? 'right' : 'left'),
          rotation: d.rotation || 0,
          letterSpacing: d.letterSpacing || 0,
          lineHeight: d.lineHeight || 1.2,
        };
      });
    
    if (textOverlays.length > 0) {
      try {
        const rendered = await renderTextOverlay(resultUri, textOverlays, {
          width: page.original_width,
          height: page.original_height,
        });
        resultUri = rendered.uri;
      } catch (e) {
        console.warn('Text overlay failed:', e);
      }
    }
  }
  
  if (options.format === 'jpg') {
    const compressed = await manipulateAsync(
      resultUri,
      [],
      { compress: (options.quality || 95) / 100, format: SaveFormat.JPEG }
    );
    resultUri = compressed.uri;
  }
  
  return resultUri;
}

async function renderTextOverlay(baseUri, textOverlays, dimensions) {
  return await manipulateAsync(baseUri, [], { format: SaveFormat.PNG });
}

export async function exportChapter(projectId, pageIds, options = {}) {
  const results = [];
  for (const pageId of pageIds) {
    try {
      const uri = await exportPage(pageId, options);
      results.push({ pageId, uri, success: true });
    } catch (e) {
      results.push({ pageId, error: e.message, success: false });
    }
  }
  return results;
}

export async function shareExportedImage(uri, fileName = 'exported-image.png') {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('المشاركة غير متوفرة على هذا الجهاز');
  }
  
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'مشاركة الصورة المصدرة',
    UTI: 'public.png',
  });
}

export async function saveToGallery(uri, fileName) {
  return await saveExportedImage(uri, fileName);
}