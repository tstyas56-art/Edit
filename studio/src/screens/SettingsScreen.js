import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Switch, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { initDatabase, setSetting, getSetting } from '../services/database';
import { deleteProjectDir } from '../services/storage';
import { BackIcon, TrashIcon } from '../components/Icons';

export default function SettingsScreen() {
  const router = useRouter();
  const [rtlEnabled, setRtlEnabled] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [fontSize, setFontSize] = useState(24);
  const [exportQuality, setExportQuality] = useState(95);
  const [stats, setStats] = useState({ projects: 0, pages: 0, dialogues: 0 });

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      await initDatabase();
      const rtl = await getSetting('rtl_enabled', true);
      const save = await getSetting('auto_save', true);
      const fSize = await getSetting('default_font_size', 24);
      const quality = await getSetting('export_quality', 95);
      setRtlEnabled(rtl);
      setAutoSave(save);
      setFontSize(fSize);
      setExportQuality(quality);
    } catch (e) {
      console.error('Load settings failed:', e);
    }
  };

  const loadStats = async () => {
    try {
      const db = await initDatabase();
      const projects = await db.getAllAsync('SELECT COUNT(*) as count FROM projects');
      const pages = await db.getAllAsync('SELECT COUNT(*) as count FROM pages');
      const dialogues = await db.getAllAsync('SELECT COUNT(*) as count FROM dialogues');
      setStats({
        projects: projects[0]?.count || 0,
        pages: pages[0]?.count || 0,
        dialogues: dialogues[0]?.count || 0,
      });
    } catch (e) {
      console.error('Load stats failed:', e);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'مسح جميع البيانات',
      'هل أنت متأكد؟ سيتم حذف جميع الفصول والصفحات والترجمات نهائياً.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await initDatabase();
              await db.execAsync('DELETE FROM dialogues; DELETE FROM layers; DELETE FROM pages; DELETE FROM projects;');
              setStats({ projects: 0, pages: 0, dialogues: 0 });
              Alert.alert('تم', 'تم مسح جميع البيانات');
            } catch (e) {
              Alert.alert('خطأ', 'فشل مسح البيانات');
            }
          },
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: 'عام',
      items: [
        {
          label: 'الاتجاه من اليمين لليسار',
          value: rtlEnabled,
          onToggle: (v) => { setRtlEnabled(v); setSetting('rtl_enabled', v); },
          type: 'switch',
        },
        {
          label: 'الحفظ التلقائي',
          value: autoSave,
          onToggle: (v) => { setAutoSave(v); setSetting('auto_save', v); },
          type: 'switch',
        },
      ],
    },
    {
      title: 'المحرر',
      items: [
        {
          label: 'حجم الخط الافتراضي',
          value: `${fontSize}px`,
          onPress: () => {
            const sizes = [16, 20, 24, 28, 32, 36, 40, 48, 56, 64];
            const next = sizes[sizes.indexOf(fontSize) + 1] || sizes[0];
            setFontSize(next);
            setSetting('default_font_size', next);
          },
          type: 'value',
        },
      ],
    },
    {
      title: 'التصدير',
      items: [
        {
          label: 'جودة التصدير',
          value: `${exportQuality}%`,
          onPress: () => {
            const qualities = [80, 85, 90, 95, 100];
            const next = qualities[qualities.indexOf(exportQuality) + 1] || qualities[0];
            setExportQuality(next);
            setSetting('export_quality', next);
          },
          type: 'value',
        },
      ],
    },
    {
      title: 'حول',
      items: [
        { label: 'الإصدار', value: '1.0.0', type: 'value' },
        { label: 'الفصول', value: `${stats.projects}`, type: 'value' },
        { label: 'الصفحات', value: `${stats.pages}`, type: 'value' },
        { label: 'الحوارات', value: `${stats.dialogues}`, type: 'value' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <BackIcon size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.settingRow, ii < section.items.length - 1 && styles.settingRowBorder]}
                  onPress={item.type === 'value' ? item.onPress : null}
                  activeOpacity={item.type === 'switch' ? 1 : 0.7}
                >
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.type === 'switch' ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#2A2A2A', true: '#34C759' }}
                      thumbColor="#FFFFFF"
                    />
                  ) : (
                    <Text style={styles.settingValue}>{item.value}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearAll}>
            <TrashIcon size={18} color="#FF3B30" />
            <Text style={styles.dangerText}>مسح جميع البيانات</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>استوديو — محرر فصول المانهوا</Text>
          <Text style={styles.footerSub}>صُنع بعناية لفِرق الترجمة</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
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
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555555',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  settingLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  settingValue: {
    fontSize: 15,
    color: '#999999',
    fontWeight: '500',
  },
  dangerSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  dangerText: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
    marginRight: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555555',
  },
  footerSub: {
    fontSize: 12,
    color: '#555555',
    marginTop: 4,
  },
});