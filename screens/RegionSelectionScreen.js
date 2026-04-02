import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { fetchHighlight } from '../services/supabase';
import { fetchShowById } from '../services/tmdb';
import { useLanguage } from '../context/LanguageContext';

const regions = [
  { name: 'Egyptian', nameAr: 'مصري', emoji: '🇪🇬', color: '#C9637A', cardBg: '#52303C' },
  { name: 'Turkish', nameAr: 'تركي', emoji: '🇹🇷', color: '#C97A63', cardBg: '#523830' },
  { name: 'Gulf', nameAr: 'خليجي', emoji: '🇸🇦', color: '#7AC963', cardBg: '#305238' },
  { name: 'Syrian', nameAr: 'سوري', emoji: '🇸🇾', color: '#637AC9', cardBg: '#303852' },
  { name: 'Lebanese', nameAr: 'لبناني', emoji: '🇱🇧', color: '#C96363', cardBg: '#523030' },
  { name: 'All Arabic', nameAr: 'كل العربي', emoji: '🌍', color: '#B39DDB', cardBg: '#30304A' },
];

export default function RegionSelectionScreen({ navigation }) {
  const [highlight, setHighlight] = useState(null);
  const { language, toggleLanguage } = useLanguage();

  useEffect(() => {
    fetchHighlight().then(setHighlight);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MusalsalGo</Text>
            <Text style={styles.subtitle}>
              {language === 'ar' ? 'اكتشف مسلسلات الشرق الأوسط. اعرف أين تشاهدها.' : 'Discover Middle Eastern TV. Find where to watch.'}
            </Text>
          </View>
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              onPress={() => language !== 'en' && toggleLanguage()}
            >
              <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
              onPress={() => language !== 'ar' && toggleLanguage()}
            >
              <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>AR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Highlight of the Week */}
        {highlight ? (
          <TouchableOpacity
            style={styles.highlightCard}
            activeOpacity={0.85}
            onPress={async () => {
              const show = highlight.tmdb_id
                ? await fetchShowById(highlight.tmdb_id)
                : { name: highlight.title, overview: highlight.description, poster_url: highlight.poster_url };
              navigation.navigate('EpisodeDetail', { show, accent: '#FFAB76' });
            }}
          >
            <View style={styles.highlightBody}>
              {highlight.poster_url ? (
                <Image source={{ uri: highlight.poster_url }} style={styles.highlightPoster} />
              ) : null}
              <View style={styles.highlightText}>
                <Text style={styles.highlightBadge}>⭐ {language === 'ar' ? 'أبرز مسلسل الأسبوع' : 'Highlight of the Week'}</Text>
                <Text style={styles.highlightTitle}>{highlight.title}</Text>
                {highlight.why_we_picked ? (
                  <Text style={styles.highlightWhy} numberOfLines={2}>"{highlight.why_we_picked}"</Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Region label */}
        <Text style={styles.sectionLabel}>
          {language === 'ar' ? 'تصفح حسب بلد الإنتاج' : 'Browse shows by country of origin'}
        </Text>

        {/* Region grid */}
        <View style={styles.grid}>
          {regions.map((region) => (
            <TouchableOpacity
              key={region.name}
              style={[styles.card, { backgroundColor: region.cardBg }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EraSelection', { region: region.name })}
            >
              <Text style={styles.emoji}>{region.emoji}</Text>
              <Text style={[styles.label, { color: region.color }]}>{language === 'ar' ? region.nameAr : region.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F5E6D0',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#A08060',
    marginTop: 4,
    maxWidth: 240,
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2C',
    borderRadius: 8,
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#F5E6D0',
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B6B70',
  },
  langBtnTextActive: {
    color: '#1C1C1E',
  },
  highlightCard: {
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  highlightBody: {
    flexDirection: 'row',
    gap: 12,
  },
  highlightPoster: {
    width: 70,
    height: 105,
    borderRadius: 8,
  },
  highlightText: {
    flex: 1,
    justifyContent: 'center',
  },
  highlightBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFAB76',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  highlightTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F5E6D0',
    marginBottom: 6,
  },
  highlightWhy: {
    fontSize: 12,
    color: '#FFAB76',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B70',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  card: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
