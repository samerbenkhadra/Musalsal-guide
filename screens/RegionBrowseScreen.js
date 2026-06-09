import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { usePostHog } from 'posthog-react-native';

const REGIONS = [
  { name: 'Egyptian',   nameAr: 'مصري',    emoji: '🇪🇬',       color: '#C9637A', cardBg: '#52303C' },
  { name: 'Turkish',    nameAr: 'تركي',    emoji: '🇹🇷',       color: '#C97A63', cardBg: '#523830' },
  { name: 'Gulf',       nameAr: 'خليجي',   emoji: '🇸🇦🇰🇼', color: '#7AC963', cardBg: '#305238' },
  { name: 'Syrian',     nameAr: 'سوري',    emoji: '🇸🇾',       color: '#637AC9', cardBg: '#303852' },
  { name: 'Lebanese',   nameAr: 'لبناني',  emoji: '🇱🇧',       color: '#C96363', cardBg: '#523030' },
  { name: 'All Regions',nameAr: 'كل المناطق', emoji: '🌍',    color: '#B39DDB', cardBg: '#30304A' },
];

export default function RegionBrowseScreen({ navigation }) {
  const { language } = useLanguage();
  const posthog = usePostHog();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{language === 'ar' ? 'تصفح بالمنطقة' : 'Browse by Region'}</Text>
        <Text style={styles.note}>{language === 'ar' ? 'تصفح حسب بلد الإنتاج' : 'Browse shows by country of origin'}</Text>
        <View style={styles.grid}>
          {REGIONS.map(region => (
            <TouchableOpacity
              key={region.name}
              style={[styles.card, { backgroundColor: region.cardBg }]}
              activeOpacity={0.8}
              onPress={() => {
                posthog?.capture('region_selected', { region: region.name });
                navigation.navigate('Recommendations', { region: region.name, accent: region.color });
              }}
            >
              <Text style={styles.emoji}>{region.emoji}</Text>
              <Text style={[styles.label, { color: region.color }]}>
                {language === 'ar' ? region.nameAr : region.name}
              </Text>
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
  note: { fontSize: 13, color: '#A08060', marginBottom: 20, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  card: { width: '47%', aspectRatio: 1.3, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 36, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },
});
