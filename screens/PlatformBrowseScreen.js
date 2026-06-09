import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { fetchDistinctPlatforms } from '../services/supabase';
import { useLanguage } from '../context/LanguageContext';

const PLATFORM_COLORS = {
  'Shahid':     '#E84040',
  'Netflix':    '#E50914',
  'OSN+':       '#A78BFA',
  'Starz Play': '#F472B6',
  'Weyyak':     '#FB923C',
  'Watch iT':   '#60A5FA',
  'MBC':        '#34D399',
  'YouTube':    '#FF4444',
  'Apple TV':   '#A3A3A3',
  'TOD':        '#C084FC',
  'AD TV':      '#38BDF8',
  'Yango Play': '#FBBF24',
  'Viu':        '#4ADE80',
};

const DEFAULT_COLOR = '#FFAB76';

export default function PlatformBrowseScreen({ navigation }) {
  const { language } = useLanguage();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistinctPlatforms(5).then(p => { setPlatforms(p); setLoading(false); });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{language === 'ar' ? 'تصفح بالمنصة' : 'Browse by Platform'}</Text>

        {loading ? (
          <ActivityIndicator color="#FFAB76" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>{language === 'ar' ? 'حسب المنصة' : 'BY PLATFORM'}</Text>
            <View style={styles.list}>
              {platforms.map(({ platform, count }, index) => {
                const color = PLATFORM_COLORS[platform] || DEFAULT_COLOR;
                return (
                  <TouchableOpacity
                    key={platform}
                    style={[styles.listItem, index < platforms.length - 1 && styles.listItemBorder]}
                    onPress={() => navigation.navigate('Category', { title: platform, platform, accent: color })}
                  >
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text style={styles.listLabel}>{platform}</Text>
                    <Text style={styles.listCount}>{count} {language === 'ar' ? 'مسلسل' : 'shows'}</Text>
                    <Text style={styles.listArrow}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '600', color: '#FFAB76' },
  title: { fontSize: 26, fontWeight: '800', color: '#F5E6D0', marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6B6B70', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  list: { backgroundColor: '#2A2A2C', borderRadius: 16, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 14 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: '#3A3A3C' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  listLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#F5E6D0' },
  listCount: { fontSize: 13, color: '#6B6B70' },
  listArrow: { fontSize: 24, color: '#6B6B70' },
});
