import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const THEMES = [
  { key: 'romance',  label: 'Romance',  labelAr: 'رومانسية', color: '#E8A0BF' },
  { key: 'drama',    label: 'Drama',    labelAr: 'دراما',    color: '#FFAB76' },
  { key: 'suspense', label: 'Suspense', labelAr: 'إثارة',   color: '#B39DDB' },
  { key: 'comedy',   label: 'Comedy',   labelAr: 'كوميديا', color: '#FFD166' },
];

export default function ThemeBrowseScreen({ navigation }) {
  const { language } = useLanguage();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{language === 'ar' ? 'تصفح بالموضوع' : 'Browse by Theme'}</Text>
        <Text style={styles.subtitle}>{language === 'ar' ? 'اختيارات مُنتقاة — تصنيفنا حسب الموضوع' : 'Curated picks — our selection by theme'}</Text>

        <Text style={styles.sectionLabel}>{language === 'ar' ? 'حسب الموضوع' : 'BY THEME'}</Text>
        <View style={styles.list}>
          {THEMES.map((theme, index) => (
            <TouchableOpacity
              key={theme.key}
              style={[styles.listItem, index < THEMES.length - 1 && styles.listItemBorder]}
              onPress={() => navigation.navigate('Category', {
                title: language === 'ar' ? theme.labelAr : theme.label,
                type: theme.key,
                accent: theme.color,
              })}
            >
              <View style={[styles.dot, { backgroundColor: theme.color }]} />
              <Text style={styles.listLabel}>{language === 'ar' ? theme.labelAr : theme.label}</Text>
              <Text style={styles.listArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '600', color: '#FFAB76' },
  title: { fontSize: 26, fontWeight: '800', color: '#F5E6D0', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#A08060', marginBottom: 20, fontStyle: 'italic' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6B6B70', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  list: { backgroundColor: '#2A2A2C', borderRadius: 16, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 14 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: '#3A3A3C' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  listLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#F5E6D0' },
  listArrow: { fontSize: 24, color: '#6B6B70' },
});
