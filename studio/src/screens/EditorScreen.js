import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from '../navigation';
import {
  getPageById, getLayersByPageId, getDialoguesByProjectId, getProjectById,
  createLayer, updateLayer, updateDialogue, deleteLayer,
} from '../services/database';
import { generateId } from '../services/storage';
import {
  BackIcon, UndoIcon, RedoIcon, TextToolIcon, BrushToolIcon, LayersIcon,
  TranslationIcon, FocusModeIcon, ExportIcon, CloseIcon, EyeShowIcon, EyeHideIcon,
  LockIcon, TrashIcon, DragHandleIcon,
} from '../components/Icons';
import { exportPage } from '../services/export';

const { width: SW, height: SH } = Dimensions.get('window');

const COLORS = {
  bg: '#080808', bg2: '#0F0F0F', bg3: '#111111', bg4: '#1A1A1A',
  border: '#2A2A2A', border2: '#383838',
  text: '#FFFFFF', text2: '#999999', text3: '#555555',
  accent: '#FFFFFF', success: '#34C759', warning: '#FF9F0A', error: '#FF3B30',
};

export default function EditorScreen() {
  const router = useRouter();
  const { id: pageId } = useLocalSearchParams();

  const [page, setPage] = useState(null);
  const [project, setProject] = useState(null);
  const [layers, setLayers] = useState([]);
  const [dialogues, setDialogues] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showTextProps, setShowTextProps] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [activeDialogueIndex, setActiveDialogueIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [textProps, setTextProps] = useState({
    fontSize: 24, alignment: 'center', letterSpacing: 0, lineHeight: 1.2,
    outline: false, outlineThickness: 1, shadow: false, opacity: 1, fontFamily: 'Cairo',
  });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ w: SW, h: SH });


  useEffect(() => {
    loadData();
  }, [pageId]);


  const loadData = async () => {
    try {
      const pg = await getPageById(pageId);
      if (!pg) return;
      setPage(pg);
      const [pr, ls, ds] = await Promise.all([
        getProjectById(pg.project_id),
        getLayersByPageId(pageId),
        getDialoguesByProjectId(pg.project_id),
      ]);
      setProject(pr);
      setLayers(ls);
      setDialogues(ds);
      if (pg.original_width && pg.original_height) {
        const aspect = pg.original_height / pg.original_width;
        setCanvasSize({ w: SW, h: SW * aspect });
      }
    } catch (e) {
      console.error('Editor load failed:', e);
    }
  };

  const remainingDialogues = dialogues.filter(d => !d.isPlaced);
  const currentDialogue = remainingDialogues[activeDialogueIndex] || remainingDialogues[0];
  const placementProgress = dialogues.length > 0
    ? `${dialogues.filter(d => d.isPlaced).length} / ${dialogues.length}`
    : '0 / 0';


  const handlePlaceText = async (x, y) => {
    if (!currentDialogue) return;
    const nx = x / canvasSize.w;
    const ny = y / canvasSize.h;
    const layerId = generateId();
    const newLayer = {
      id: layerId,
      pageId,
      index: layers.length,
      type: 'text',
      visible: true,
      locked: false,
      data: {
        content: currentDialogue.content,
        x: nx,
        y: ny,
        fontSize: textProps.fontSize,
        fontFamily: textProps.fontFamily,
        alignment: textProps.alignment,
        letterSpacing: textProps.letterSpacing,
        lineHeight: textProps.lineHeight,
        outline: textProps.outline ? { thickness: textProps.outlineThickness, color: '#000000' } : null,
        shadow: textProps.shadow ? { blur: 4, offsetX: 2, offsetY: 2, color: 'rgba(0,0,0,0.5)' } : null,
        opacity: textProps.opacity,
        rotation: 0,
        width: 0.3,
      },
    };
    await createLayer(newLayer);
    await updateDialogue(currentDialogue.id, {
      is_placed: 1,
      placed_on_page_id: pageId,
      placed_layer_id: layerId,
    });
    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);
    const updatedDialogues = dialogues.map(d =>
      d.id === currentDialogue.id ? { ...d, isPlaced: true, placedOnPageId: pageId, placedLayerId: layerId } : d
    );
    setDialogues(updatedDialogues);
    const nextIndex = activeDialogueIndex;
    const nextRemaining = updatedDialogues.filter(d => !d.isPlaced);
    if (nextRemaining.length > 0) {
      setActiveDialogueIndex(0);
    } else {
      setPlacementMode(false);
      setShowTranslation(false);
    }
  };

  const handleCreateText = async (x, y) => {
    const nx = x / canvasSize.w;
    const ny = y / canvasSize.h;
    const layerId = generateId();
    const newLayer = {
      id: layerId,
      pageId,
      index: layers.length,
      type: 'text',
      visible: true,
      locked: false,
      data: {
        content: 'نص جديد',
        x: nx,
        y: ny,
        fontSize: textProps.fontSize,
        fontFamily: textProps.fontFamily,
        alignment: textProps.alignment,
        letterSpacing: textProps.letterSpacing,
        lineHeight: textProps.lineHeight,
        outline: null,
        shadow: null,
        opacity: textProps.opacity,
        rotation: 0,
        width: 0.3,
      },
    };
    await createLayer(newLayer);
    setLayers([...layers, newLayer]);
    setSelectedLayerId(layerId);
    setShowTextProps(true);
  };

  const handleDeleteLayer = async (layerId) => {
    await deleteLayer(layerId);
    setLayers(layers.filter(l => l.id !== layerId));
    if (selectedLayerId === layerId) setSelectedLayerId(null);
  };

  const handleToggleVisibility = async (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    const updated = { ...layer, visible: !layer.visible };
    await updateLayer(layerId, { visible: updated.visible ? 1 : 0 });
    setLayers(layers.map(l => l.id === layerId ? updated : l));
  };

  const handleToggleLock = async (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    const updated = { ...layer, locked: !layer.locked };
    await updateLayer(layerId, { locked: updated.locked ? 1 : 0 });
    setLayers(layers.map(l => l.id === layerId ? updated : l));
  };

  const handleExport = async (options) => {
    try {
      const uri = await exportPage(pageId, options);
      setShowExport(false);
      Alert.alert('تم التصدير', 'تم تصدير الصفحة بنجاح');
    } catch (e) {
      Alert.alert('خطأ', 'فشل تصدير الصفحة');
    }
  };


  const getToolStyle = (tool) => ({
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: activeTool === tool ? '#FFFFFF' : 'transparent',
  });

  const renderCanvas = () => {
    const textLayers = layers.filter(l => l.type === 'text' && l.visible);
    return (
      <View style={[styles.canvasPreview, { width: canvasSize.w, height: canvasSize.h }]}>
        {page?.original_image_uri ? (
          <Image
            source={{ uri: page.original_image_uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
        ) : null}
        {textLayers.map(layer => {
          const d = layer.data;
          const px = d.x * canvasSize.w;
          const py = d.y * canvasSize.h;
          return (
            <Text
              key={layer.id}
              style={[
                styles.canvasTextLayer,
                {
                  left: px,
                  top: py,
                  fontSize: d.fontSize || 24,
                  opacity: d.opacity || 1,
                  textAlign: d.alignment || 'center',
                },
              ]}
            >
              {d.content}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" hidden={focusMode} />

      <View style={styles.canvasWrap}>
        <View
          style={[styles.canvasContainer, {
            transform: [
              { scale: zoom },
              { translateX: pan.x },
              { translateY: pan.y },
            ],
          }]}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(event) => {
            const { locationX, locationY } = event.nativeEvent;
            if (placementMode && currentDialogue) {
              handlePlaceText(locationX, locationY);
            } else if (activeTool === 'text') {
              handleCreateText(locationX, locationY);
            }
          }}
        >
          {renderCanvas()}
        </View>
      </View>

      {!focusMode && (
        <>
          <View style={styles.topBar} pointerEvents="box-none">
            <View pointerEvents="auto">
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                <BackIcon size={18} />
              </TouchableOpacity>
            </View>
            <View style={styles.topTitle} pointerEvents="none">
              <Text style={styles.topTitleText} numberOfLines={1}>{project?.name}</Text>
              <Text style={styles.topPageNum}>صفحة {(page?.index || 0) + 1}</Text>
            </View>
            <View style={{ flexDirection: 'row' }} pointerEvents="auto">
              <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
                <UndoIcon size={18} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
                <RedoIcon size={18} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.toolbar} pointerEvents="box-none">
            <View style={styles.toolbarInner} pointerEvents="auto">
              <TouchableOpacity style={getToolStyle('text')} onPress={() => { setActiveTool(activeTool === 'text' ? null : 'text'); setShowTextProps(activeTool !== 'text'); }}>
                <TextToolIcon size={20} color={activeTool === 'text' ? '#080808' : '#FFFFFF'} />
              </TouchableOpacity>
              <TouchableOpacity style={getToolStyle('brush')} onPress={() => setActiveTool(activeTool === 'brush' ? null : 'brush')}>
                <BrushToolIcon size={20} color={activeTool === 'brush' ? '#080808' : '#FFFFFF'} />
              </TouchableOpacity>
              <TouchableOpacity style={getToolStyle('layers')} onPress={() => setShowLayers(!showLayers)}>
                <LayersIcon size={20} color={showLayers ? '#080808' : '#FFFFFF'} />
              </TouchableOpacity>
              <TouchableOpacity style={getToolStyle('translation')} onPress={() => { setShowTranslation(!showTranslation); setPlacementMode(false); }}>
                <TranslationIcon size={20} color={showTranslation ? '#080808' : '#FFFFFF'} />
              </TouchableOpacity>
              <TouchableOpacity style={getToolStyle('focus')} onPress={() => setFocusMode(true)}>
                <FocusModeIcon size={20} color={focusMode ? '#080808' : '#FFFFFF'} />
              </TouchableOpacity>
              <TouchableOpacity style={getToolStyle('export')} onPress={() => setShowExport(true)}>
                <ExportIcon size={20} color={showExport ? '#080808' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.zoomIndicator} pointerEvents="none">
            <Text style={styles.zoomText}>{zoom.toFixed(1)}×</Text>
          </View>
        </>
      )}

      {focusMode && (
        <View style={styles.focusOverlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.focusExit} onPress={() => setFocusMode(false)} pointerEvents="auto">
            <CloseIcon size={20} />
          </TouchableOpacity>
          {currentDialogue && (
            <View style={styles.focusCard} pointerEvents="none">
              <Text style={styles.focusText}>{currentDialogue?.content}</Text>
              <Text style={styles.focusCounter}>{placementProgress}</Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.translationPanel, { transform: [{ translateX: showTranslation ? 0 : SW }] }]}>
        <View style={styles.transHeader}>
          <Text style={styles.transTitle}>الترجمة</Text>
          <View style={styles.transProgress}>
            <Text style={styles.transProgressText}>{placementProgress}</Text>
          </View>
          <TouchableOpacity onPress={() => { setShowTranslation(false); setPlacementMode(false); }}>
            <CloseIcon size={20} />
          </TouchableOpacity>
        </View>
        <View style={styles.filterChips}>
          <TouchableOpacity style={styles.chipActive}><Text style={styles.chipTextActive}>الكل</Text></TouchableOpacity>
          <TouchableOpacity style={styles.chip}><Text style={styles.chipText}>المتبقي</Text></TouchableOpacity>
          <TouchableOpacity style={styles.chip}><Text style={styles.chipText}>تم</Text></TouchableOpacity>
        </View>
        <ScrollView style={styles.dialogueList} showsVerticalScrollIndicator={false}>
          {dialogues.map((d, i) => (
            <TouchableOpacity
              key={d.id}
              style={[
                styles.dialogueItem,
                placementMode && currentDialogue?.id === d.id && styles.dialogueItemActive,
                d.isPlaced && styles.dialogueItemDone,
              ]}
              onPress={() => {
                if (!d.isPlaced) {
                  setActiveDialogueIndex(i);
                  setPlacementMode(true);
                  setShowTranslation(false);
                }
              }}
            >
              <View style={styles.dialogueCheck}>
                {d.isPlaced ? (
                  <View style={styles.checkCircleDone}><Text style={styles.checkMark}>✓</Text></View>
                ) : (
                  <View style={styles.checkCircle} />
                )}
              </View>
              <Text style={[
                styles.dialogueText,
                d.isPlaced && styles.dialogueTextDone,
                placementMode && currentDialogue?.id === d.id && styles.dialogueTextActive,
              ]} numberOfLines={2}>
                {d.content}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.layersPanel, { transform: [{ translateY: showLayers ? SH * 0.4 : SH }] }]}>
        <View style={styles.layersHeader}>
          <Text style={styles.layersTitle}>الطبقات</Text>
          <TouchableOpacity onPress={() => setShowLayers(false)}>
            <CloseIcon size={20} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.layerList} showsVerticalScrollIndicator={false}>
          {layers.map((layer, idx) => (
            <View key={layer.id} style={[styles.layerRow, selectedLayerId === layer.id && styles.layerRowActive]}>
              <DragHandleIcon size={16} color="#555555" />
              <View style={styles.layerBadge}>
                <Text style={styles.layerBadgeText}>{layer.type === 'text' ? 'نص' : layer.type === 'drawing' ? 'رسم' : 'أساس'}</Text>
              </View>
              <Text style={styles.layerName} numberOfLines={1}>
                {layer.type === 'text' ? layer.data?.content?.substring(0, 20) || 'نص' : layer.type === 'drawing' ? 'طبقة رسم' : 'الصفحة'}
              </Text>
              <View style={styles.layerActions}>
                <TouchableOpacity onPress={() => handleToggleVisibility(layer.id)}>
                  {layer.visible ? <EyeShowIcon size={18} /> : <EyeHideIcon size={18} color="#555555" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleToggleLock(layer.id)} style={{ marginHorizontal: 8 }}>
                  {layer.locked ? <LockIcon size={18} color="#FF9F0A" /> : <LockIcon size={18} color="#555555" />}
                </TouchableOpacity>
                {layer.type !== 'base' && (
                  <TouchableOpacity onPress={() => handleDeleteLayer(layer.id)}>
                    <TrashIcon size={18} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.textPropsPanel, { transform: [{ translateY: showTextProps ? SH - 320 : SH }] }]}>
        <View style={styles.textPropsHeader}>
          <Text style={styles.textPropsTitle}>خصائص النص</Text>
          <TouchableOpacity onPress={() => setShowTextProps(false)}>
            <CloseIcon size={20} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.textPropsContent} showsVerticalScrollIndicator={false}>
          <View style={styles.propRow}>
            <Text style={styles.propLabel}>حجم الخط</Text>
            <Text style={styles.propValue}>{textProps.fontSize}px</Text>
          </View>
          <View style={styles.sliderTrack}>
            <TouchableOpacity style={styles.sliderBtn} onPress={() => setTextProps({ ...textProps, fontSize: Math.max(8, textProps.fontSize - 2) })}>
              <Text style={styles.sliderBtnText}>-</Text>
            </TouchableOpacity>
            <View style={styles.sliderBar}>
              <View style={[styles.sliderFill, { width: `${((textProps.fontSize - 8) / 112) * 100}%` }]} />
            </View>
            <TouchableOpacity style={styles.sliderBtn} onPress={() => setTextProps({ ...textProps, fontSize: Math.min(120, textProps.fontSize + 2) })}>
              <Text style={styles.sliderBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.propRow}>
            <Text style={styles.propLabel}>المحاذاة</Text>
          </View>
          <View style={styles.alignRow}>
            {['right', 'center', 'left'].map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.alignBtn, textProps.alignment === a && styles.alignBtnActive]}
                onPress={() => setTextProps({ ...textProps, alignment: a })}
              >
                <Text style={[styles.alignBtnText, textProps.alignment === a && styles.alignBtnTextActive]}>
                  {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.propRow}>
            <Text style={styles.propLabel}>الشفافية</Text>
            <Text style={styles.propValue}>{Math.round(textProps.opacity * 100)}%</Text>
          </View>
          <View style={styles.sliderTrack}>
            <TouchableOpacity style={styles.sliderBtn} onPress={() => setTextProps({ ...textProps, opacity: Math.max(0, textProps.opacity - 0.05) })}>
              <Text style={styles.sliderBtnText}>-</Text>
            </TouchableOpacity>
            <View style={styles.sliderBar}>
              <View style={[styles.sliderFill, { width: `${textProps.opacity * 100}%` }]} />
            </View>
            <TouchableOpacity style={styles.sliderBtn} onPress={() => setTextProps({ ...textProps, opacity: Math.min(1, textProps.opacity + 0.05) })}>
              <Text style={styles.sliderBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <View style={[styles.exportPanel, { transform: [{ translateY: showExport ? 0 : SH }] }]}>
        <View style={styles.exportHeader}>
          <Text style={styles.exportTitle}>تصدير</Text>
          <TouchableOpacity onPress={() => setShowExport(false)}>
            <CloseIcon size={20} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.exportContent} showsVerticalScrollIndicator={false}>
          <View style={styles.exportSection}>
            <Text style={styles.exportLabel}>النطاق</Text>
            <View style={styles.exportOptionRow}>
              <View style={styles.radioActive}><View style={styles.radioDot} /></View>
              <Text style={styles.exportOptionText}>الصفحة الحالية</Text>
            </View>
          </View>
          <View style={styles.exportSection}>
            <Text style={styles.exportLabel}>الصيغة</Text>
            <View style={styles.formatRow}>
              <TouchableOpacity style={[styles.formatBtn, styles.formatBtnActive]}>
                <Text style={styles.formatBtnTextActive}>PNG</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formatBtn}>
                <Text style={styles.formatBtnText}>JPG</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.exportNote}>
            <Text style={styles.exportNoteText}>يتم دمج جميع الطبقات المرئية عند التصدير</Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport({ format: 'png' })}>
            <Text style={styles.exportBtnText}>تصدير الصفحة</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  canvasWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  canvasContainer: { backgroundColor: '#111111' },
  canvasPreview: { backgroundColor: '#111111', overflow: 'hidden' },
  canvasTextLayer: {
    position: 'absolute',
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26,26,26,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  topTitle: { alignItems: 'center', flex: 1 },
  topTitleText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  topPageNum: { fontSize: 11, color: '#555555', marginTop: 2 },

  toolbar: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  toolbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,17,17,0.92)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
  },

  zoomIndicator: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    zIndex: 10,
  },
  zoomText: { fontSize: 11, color: '#555555', fontWeight: '500' },

  focusOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusExit: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26,26,26,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusCard: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    minWidth: 200,
    alignItems: 'center',
  },
  focusText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  focusCounter: {
    fontSize: 13,
    color: '#555555',
    marginTop: 8,
  },

  translationPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 320,
    backgroundColor: '#0F0F0F',
    borderLeftWidth: 1,
    borderLeftColor: '#2A2A2A',
    zIndex: 50,
    paddingTop: 16,
  },
  transHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  transTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  transProgress: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  transProgressText: { fontSize: 12, color: '#999999', fontWeight: '500' },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1A1A1A',
    marginLeft: 8,
  },
  chipActive: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginLeft: 8,
  },
  chipText: { fontSize: 12, color: '#555555', fontWeight: '500' },
  chipTextActive: { fontSize: 12, color: '#080808', fontWeight: '600' },
  dialogueList: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  dialogueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  dialogueItemActive: {
    backgroundColor: '#1A1A1A',
    borderRightWidth: 3,
    borderRightColor: '#FFFFFF',
  },
  dialogueItemDone: { opacity: 0.5 },
  dialogueCheck: { marginLeft: 12 },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#555555',
  },
  checkCircleDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  dialogueText: { flex: 1, fontSize: 14, color: '#FFFFFF', textAlign: 'right' },
  dialogueTextDone: { color: '#555555', textDecorationLine: 'line-through' },
  dialogueTextActive: { color: '#FFFFFF', fontWeight: '600' },

  layersPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SH * 0.6,
    backgroundColor: '#111111',
    zIndex: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  layersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  layersTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  layerList: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  layerRowActive: {
    backgroundColor: '#1A1A1A',
    borderRightWidth: 2,
    borderRightColor: '#FFFFFF',
  },
  layerBadge: {
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginHorizontal: 10,
  },
  layerBadgeText: { fontSize: 10, color: '#999999', fontWeight: '500' },
  layerName: { flex: 1, fontSize: 14, color: '#FFFFFF', textAlign: 'right' },
  layerActions: { flexDirection: 'row', alignItems: 'center' },

  textPropsPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SH,
    backgroundColor: '#111111',
    zIndex: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  textPropsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  textPropsTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  textPropsContent: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  propRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  propLabel: { fontSize: 14, color: '#999999', fontWeight: '500' },
  propValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  sliderTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderBtnText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600' },
  sliderBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  alignRow: { flexDirection: 'row', marginBottom: 24 },
  alignBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  alignBtnActive: { backgroundColor: '#FFFFFF' },
  alignBtnText: { fontSize: 14, color: '#555555' },
  alignBtnTextActive: { color: '#080808', fontWeight: '600' },

  exportPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SH,
    backgroundColor: '#080808',
    zIndex: 60,
    paddingTop: 16,
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  exportTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  exportContent: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  exportSection: { marginBottom: 28 },
  exportLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  exportOptionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radioActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  exportOptionText: { fontSize: 15, color: '#FFFFFF' },
  formatRow: { flexDirection: 'row' },
  formatBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  formatBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  formatBtnText: { fontSize: 15, color: '#999999', fontWeight: '500' },
  formatBtnTextActive: { color: '#080808', fontWeight: '600' },
  exportNote: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  exportNoteText: { fontSize: 13, color: '#555555', textAlign: 'center' },
  exportBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportBtnText: { fontSize: 16, fontWeight: '600', color: '#080808' },
});