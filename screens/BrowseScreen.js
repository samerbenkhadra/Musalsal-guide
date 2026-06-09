import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useLanguage } from '../context/LanguageContext';

const BROWSE_OPTIONS = [
  { key: 'actor',  label: 'By Actor',  labelAr: 'بالممثل',  screen: 'ActorBrowse' },
  { key: 'region', label: 'By Region', labelAr: 'بالمنطقة', screen: 'RegionBrowse' },
  { key: 'theme',  label: 'By Theme',  labelAr: 'بالموضوع', screen: 'ThemeBrowse' },
];

export default function BrowseScreen({ navigation }) {
  const { language, toggleLanguage } = useLanguage();
  const posthog = usePostHog();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>MusalsalGo</Text>
          <Text style={styles.subtitle}>{language === 'ar' ? 'اكتشف مسلسلات الشرق الأوسط.' : 'Discover Middle Eastern TV.'}</Text>
        </View>
        <View style={styles.langToggle}>
          <TouchableOpacity style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => language !== 'en' && toggleLanguage()}>
            <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, language === 'ar' && styles.langBtnActive]} onPress={() => language !== 'ar' && toggleLanguage()}>
            <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>AR</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>{language === 'ar' ? 'تصفح حسب' : 'Browse by'}</Text>
        <View style={styles.list}>
          {BROWSE_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.listItem, index < BROWSE_OPTIONS.length - 1 && styles.listItemBorder]}
              onPress={() => { posthog?.capture('browse_category_tapped', { category: option.key }); navigation.navigate(option.screen); }}
            >
              <Text style={styles.listLabel}>{language === 'ar' ? option.labelAr : option.label}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#F5E6D0', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#A08060', marginTop: 2 },
  langToggle: { flexDirection: 'row', backgroundColor: '#2A2A2C', borderRadius: 8, padding: 3 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#F5E6D0' },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#6B6B70' },
  langBtnTextActive: { color: '#1C1C1E' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6B6B70', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  list: { backgroundColor: '#2A2A2C', borderRadius: 16, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 14 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: '#3A3A3C' },
  listLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#F5E6D0' },
  listArrow: { fontSize: 24, color: '#6B6B70' },
});
