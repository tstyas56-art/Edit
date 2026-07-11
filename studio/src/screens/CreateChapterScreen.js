import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { createProject, createPage, createDialogue } from '../services/database';
import { createProjectDir, copyImageToProject, generateId } from '../services/storage';
import { parseTranslationText } from '../services/parser';
import {
  BackIcon, OpenFolderIcon, PlusIcon, CloseIcon, CheckDoneIcon,
} from '../components/Icons';

const { height: SCREEN_H } = Dimensions.get('window');

export default function CreateChapterScreen() {
  const router = useRouter();
  const [chapterName, setChapterName] = useState('');
  const [importedImages, setImportedImages] = useState([]);
  const [translationText, setTranslationText] = useState('');
  const [importedFileName, setImportedFileName] = useState('');
  const [activeTab, setActiveTab] = useState('paste');
  const [dialogueCount, setDialogueCount] = useState(0);
  const [previewLines, setPreviewLines] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const scrollRef = useRef(null);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset, idx) => ({
        id: generateId(),
        uri: asset.uri,
        name: asset.fileName || `صورة_${importedImages.length + idx + 1}`,
        width: asset.width || 0,
        height: asset.height || 0,
      }));
      setImportedImages([...importedImages, ...newImages]);
    }
  };

  const removeImage = (id) => {
    setImportedImages(importedImages.filter((img, idx) => {
      if (img.id === id) return false;
      return true;
    }).map((img, idx) => ({ ...img, index: idx })));
  };

  const pickTranslationFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      setImportedFileName(file.name);
      const content = await readFile(file.uri);
      setTranslationText(content);
      updatePreview(content);
      setActiveTab('file');
    } catch (e) {
      console.error('Failed to read file:', e);
    }
  };

  const readFile = async (uri) => {
    const response = await fetch(uri);
    return await response.text();
  };

  const updatePreview = (text) => {
    const lines = parseTranslationText(text);
    setDialogueCount(lines.length);
    setPreviewLines(lines.slice(0, 5));
  };

  const handleTranslationChange = (text) => {
    setTranslationText(text);
    updatePreview(text);
    setActiveTab('paste');
    setImportedFileName('');
  };

  const canCreate = chapterName.trim().length > 0 && importedImages.length > 0;

  const handleCreate = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);

    try {
      const projectId = generateId();
      const now = Date.now();

      await createProjectDir(projectId);

      await createProject({
        id: projectId,
        name: chapterName.trim(),
        createdAt: now,
        updatedAt: now,
        coverPageIndex: 0,
      });

      for (let i = 0; i < importedImages.length; i++) {
        const img = importedImages[i];
        const pageId = generateId();
        const destUri = await copyImageToProject(img.uri, projectId, i);
        await createPage({
          id: pageId,
          projectId,
          index: i,
          originalImageUri: destUri,
          originalWidth: img.width || 0,
          originalHeight: img.height || 0,
          status: 'not_started',
        });
      }

      if (translationText.trim()) {
        const lines = parseTranslationText(translationText);
        for (const line of lines) {
          await createDialogue({
            id: generateId(),
            projectId,
            index: line.index,
            content: line.content,
            isPlaced: false,
            placedOnPageId: null,
            placedLayerId: null,
          });
        }
      }

      router.replace(`/chapter/${projectId}`);
    } catch (e) {
      console.error('Create failed:', e);
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <BackIcon size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>فصل جديد</Text>
        <TouchableOpacity
          style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={!canCreate || isCreating}
        >
          <Text style={[styles.createBtnText, !canCreate && styles.createBtnTextDisabled]}>
            {isCreating ? 'جاري...' : 'إنشاء'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.label}>اسم الفصل</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="الفصل 47 — العودة"
            placeholderTextColor="#555555"
            value={chapterName}
            onChangeText={setChapterName}
            maxLength={100}
            textAlign="right"
          />
        </View>

        <View style={{ marginTop: 32 }}>
          <Text style={styles.label}>استيراد الصفحات</Text>
          <Text style={styles.sublabel}>JPG, PNG, WEBP مدعومة</Text>

          {importedImages.length === 0 ? (
            <TouchableOpacity style={styles.importCard} onPress={pickImages}>
              <OpenFolderIcon size={32} color="#555555" />
              <Text style={styles.importLabel}>اختر صفحات</Text>
              <Text style={styles.importSub}>يمكنك اختيار عدة صفحات</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <TouchableOpacity style={styles.addMoreBtn} onPress={pickImages}>
                <PlusIcon size={16} color="#FFFFFF" />
                <Text style={styles.addMoreText}>إضافة صفحات</Text>
              </TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                {importedImages.map((img, idx) => (
                  <View key={img.id} style={styles.thumbWrap}>
                    <View style={styles.thumb}>
                      <Text style={styles.thumbNum}>{idx + 1}</Text>
                    </View>
                    <TouchableOpacity style={styles.thumbDelete} onPress={() => removeImage(img.id)}>
                      <CloseIcon size={12} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.importCount}>{importedImages.length} صفحة مستوردة</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 32, marginBottom: 48 }}>
          <Text style={styles.label}>الترجمة</Text>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'paste' && styles.tabActive]}
              onPress={() => setActiveTab('paste')}
            >
              <Text style={[styles.tabText, activeTab === 'paste' && styles.tabTextActive]}>لصق النص</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'file' && styles.tabActive]}
              onPress={() => setActiveTab('file')}
            >
              <Text style={[styles.tabText, activeTab === 'file' && styles.tabTextActive]}>ملف TXT</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'paste' ? (
            <TextInput
              style={styles.translationInput}
              placeholder="الحوار الأول...&#10;الحوار الثاني...&#10;الحوار الثالث..."
              placeholderTextColor="#555555"
              multiline
              value={translationText}
              onChangeText={handleTranslationChange}
              textAlign="right"
              textAlignVertical="top"
            />
          ) : (
            <TouchableOpacity style={styles.fileCard} onPress={pickTranslationFile}>
              <OpenFolderIcon size={28} color="#555555" />
              <Text style={styles.fileName}>{importedFileName || 'اختر ملف TXT'}</Text>
            </TouchableOpacity>
          )}

          {dialogueCount > 0 && (
            <View style={styles.previewBox}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewCount}>{dialogueCount} حوار تم اكتشافه</Text>
                <CheckDoneIcon size={16} color="#34C759" />
              </View>
              {previewLines.map((line) => (
                <Text key={line.index} style={styles.previewLine} numberOfLines={1}>
                  {line.index}. {line.content}
                </Text>
              ))}
              {dialogueCount > 5 && (
                <Text style={styles.previewMore}>... و {dialogueCount - 5} أكثر</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  createBtnDisabled: {
    backgroundColor: '#2A2A2A',
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#080808',
  },
  createBtnTextDisabled: {
    color: '#555555',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 12,
  },
  nameInput: {
    height: 56,
    backgroundColor: '#222222',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383838',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '400',
  },
  importCard: {
    height: 160,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  importSub: {
    fontSize: 12,
    color: '#555555',
    marginTop: 4,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  addMoreText: {
    fontSize: 13,
    color: '#FFFFFF',
    marginRight: 8,
  },
  thumbScroll: {
    flexDirection: 'row-reverse',
  },
  thumbWrap: {
    marginLeft: 12,
    position: 'relative',
  },
  thumb: {
    width: 80,
    height: 100,
    backgroundColor: '#222222',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  thumbNum: {
    fontSize: 22,
    fontWeight: '700',
    color: '#555555',
  },
  thumbDelete: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importCount: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    textAlign: 'right',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2C2C2C',
  },
  tabText: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  translationInput: {
    height: 180,
    backgroundColor: '#222222',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383838',
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  fileCard: {
    height: 100,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
  previewBox: {
    marginTop: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  previewCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
    marginRight: 8,
  },
  previewLine: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
    textAlign: 'right',
  },
  previewMore: {
    fontSize: 12,
    color: '#555555',
    marginTop: 8,
    textAlign: 'center',
  },
});