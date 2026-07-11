import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, StatusBar, Dimensions, Image, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from '../navigation';
import { initDatabase, getAllProjects, deleteProject } from '../services/database';
import { deleteProjectDir } from '../services/storage';
import {
  SearchIcon, SettingsIcon, PlusIcon, TrashIcon, MoreIcon,
} from '../components/Icons';
import CustomAlert from '../components/CustomAlert';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;
const CARD_H = CARD_W * 1.25;

export default function HomeScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertState, setAlertState] = useState({ visible: false, title: '', message: '', buttons: [] });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      await initDatabase();
      const all = await getAllProjects();
      setProjects(all);
      setFiltered(all);
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFiltered(projects);
    } else {
      const q = text.toLowerCase();
      setFiltered(projects.filter(p => p.name.toLowerCase().includes(q)));
    }
  };

  const confirmDelete = (project) => {
    setDeleteTarget(project);
    setAlertState({
      visible: true,
      title: 'حذف الفصل',
      message: `هل أنت متأكد من حذف "${project.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      buttons: [
        { text: 'إلغاء', style: 'cancel', onPress: () => setDeleteTarget(null) },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject(project.id);
              await deleteProjectDir(project.id);
              setDeleteTarget(null);
              loadProjects();
            } catch (e) {
              Alert.alert('خطأ', 'فشل حذف الفصل');
            }
          },
        },
      ],
    });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff < 1) return 'اليوم';
    if (diff === 1) return 'منذ يوم';
    if (diff < 7) return `منذ ${diff} أيام`;
    if (diff < 30) return `منذ ${Math.floor(diff / 7)} أسابيع`;
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const getStatusLabel = (s) => {
    if (s === 'complete') return 'مكتمل';
    if (s === 'in_progress') return 'قيد العمل';
    return 'لم يبدأ';
  };

  const getStatusColor = (s) => {
    if (s === 'complete') return '#34C759';
    if (s === 'in_progress') return '#FF9F0A';
    return '#555555';
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/chapter/${item.id}`)}
      onLongPress={() => confirmDelete(item)}
      activeOpacity={0.9}
    >
      <View style={styles.cardThumb}>
        <View style={styles.thumbPlaceholder}>
          <Text style={styles.thumbText}>صورة الغلاف</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.updated_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <View style={styles.header}>
        <Text style={styles.logo}>استوديو</Text>
        <Text style={styles.subtitle}>محرر الفصول</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
          <SettingsIcon size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <SearchIcon size={18} color="#555555" />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث في الفصول..."
          placeholderTextColor="#555555"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>جميع الفصول</Text>
        <Text style={styles.sectionCount}>{filtered.length} فصل</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>لا توجد فصول</Text>
            <Text style={styles.emptySub}>اضغط الزر + لإنشاء فصل جديد</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create')} activeOpacity={0.9}>
        <View style={styles.fabInner}>
          <PlusIcon size={24} color="#080808" />
        </View>
      </TouchableOpacity>

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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#555555',
    marginTop: 2,
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  settingsBtn: {
    position: 'absolute',
    top: 20,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#383838',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 12,
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '400',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: 8,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardThumb: {
    height: CARD_W * 0.75,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbText: {
    fontSize: 10,
    color: '#555555',
    fontWeight: '500',
  },
  cardInfo: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textAlign: 'right',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardDate: {
    fontSize: 10,
    color: '#555555',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    left: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
    elevation: 10,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 17,
    color: '#555555',
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 12,
    color: '#555555',
    marginTop: 8,
  },
});