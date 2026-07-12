import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from '../navigation';
import {
  getProjectById, getPagesByProjectId, getDialoguesByProjectId, initDatabase,
} from '../services/database';
import { deleteProjectDir } from '../services/storage';
import {
  BackIcon, MoreIcon, TrashIcon,
} from '../components/Icons';
import CustomAlert from '../components/CustomAlert';

const { width: SCREEN_W } = Dimensions.get('window');
const COLS = SCREEN_W > 600 ? 3 : 2;
const GAP = 2;
const CELL_SIZE = (SCREEN_W - GAP * (COLS + 1)) / COLS;

export default function ChapterScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [project, setProject] = useState(null);
  const [pages, setPages] = useState([]);
  const [dialogues, setDialogues] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertState, setAlertState] = useState({ visible: false, title: '', message: '', buttons: [] });

  const loadData = useCallback(async () => {
    try {
      const [p, pg, d] = await Promise.all([
        getProjectById(id),
        getPagesByProjectId(id),
        getDialoguesByProjectId(id),
      ]);
      setProject(p);
      setPages(pg);
      setDialogues(d);
    } catch (e) {
      console.error('Load chapter failed:', e);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalDialogues = dialogues.length;
  const placedDialogues = dialogues.filter(d => d.isPlaced).length;
  const remainingDialogues = totalDialogues - placedDialogues;
  const progress = totalDialogues > 0 ? Math.round((placedDialogues / totalDialogues) * 100) : 0;

  const getPageDialogueInfo = (pageId) => {
    const pageLayers = []; // Would come from DB
    const pageDialogues = dialogues.filter(d => d.placedOnPageId === pageId);
    const done = pageDialogues.filter(d => d.isPlaced).length;
    return { done, total: pageDialogues.length };
  };

  const handleDeleteProject = () => {
    setMenuOpen(false);
    setAlertState({
      visible: true,
      title: 'حذف الفصل',
      message: `هل أنت متأكد من حذف "${project?.name}" بشكل نهائي؟`,
      buttons: [
        { text: 'إلغاء', style: 'cancel', onPress: () => {} },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProjectDir(id);
              const db = await initDatabase();
              await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
              router.replace('/');
            } catch (e) {
              console.error('Delete failed:', e);
            }
          },
        },
      ],
    });
  };

  const getStatusDot = (status) => {
    if (status === 'complete') return '#34C759';
    if (status === 'in_progress') return '#FF9F0A';
    return 'transparent';
  };

  const renderPageCard = ({ item, index }) => {
    const diagInfo = getPageDialogueInfo(item.id);
    return (
      <TouchableOpacity
        style={styles.cell}
        onPress={() => router.push(`/editor/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cellImage}>
          <View style={styles.cellPlaceholder}>
            <Text style={styles.cellNum}>{index + 1}</Text>
          </View>
          <View style={styles.cellOverlay}>
            <Text style={styles.cellPageNum}>صفحة {index + 1}</Text>
            {totalDialogues > 0 && (
              <Text style={styles.cellDiagCount}>{diagInfo.done}/{diagInfo.total}</Text>
            )}
          </View>
          <View style={[styles.statusDot, { backgroundColor: getStatusDot(item.status) }]} />
        </View>
      </TouchableOpacity>
    );
  };

  if (!project) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor="#080808" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <BackIcon size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setMenuOpen(!menuOpen)}>
          <MoreIcon size={22} />
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteProject}>
            <TrashIcon size={18} color="#FF3B30" />
            <Text style={[styles.menuText, { color: '#FF3B30' }]}>حذف الفصل</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pages.length}</Text>
          <Text style={styles.statLabel}>الصفحات</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{placedDialogues}</Text>
          <Text style={styles.statLabel}>المكتمل</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{remainingDialogues}</Text>
          <Text style={styles.statLabel}>المتبقي</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{progress}%</Text>
          <Text style={styles.statLabel}>التقدم</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        renderItem={renderPageCard}
        numColumns={COLS}
        columnWrapperStyle={{ justifyContent: 'flex-start', paddingHorizontal: GAP }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onDismiss={() => setAlertState({ ...alertState, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#555555',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  menu: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    zIndex: 100,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuText: {
    fontSize: 15,
    marginRight: 12,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#555555',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2A2A2A',
  },
  progressTrack: {
    height: 2,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 24,
    borderRadius: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  cell: {
    width: CELL_SIZE - GAP,
    height: (CELL_SIZE - GAP) * 1.33,
    margin: GAP / 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  cellImage: {
    flex: 1,
    position: 'relative',
  },
  cellPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  cellNum: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  cellOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cellPageNum: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  cellDiagCount: {
    fontSize: 10,
    color: '#999999',
  },
  statusDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
});