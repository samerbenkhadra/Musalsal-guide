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
  { name: 'Egyptian', emoji: '🇪🇬', color: '#C9637A', cardBg: '#52303C' },
  { name: 'Turkish', emoji: '🇹🇷', color: '#C97A63', cardBg: '#523830' },
  { name: 'Gulf', emoji: '🇸🇦', color: '#7AC963', cardBg: '#305238' },
  { name: 'Syrian', emoji: '🇸🇾', color: '#637AC9', cardBg: '#303852' },
  { name: 'Lebanese', emoji: '🇱🇧', color: '#C96363', cardBg: '#523030' },
  { name: 'All Arabic', emoji: '🌍', color: '#B39DDB', cardBg: '#30304A' },
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
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>MusalsalGo</Text>
            <Text style={styles.subtitle}>Discover Middle Eastern TV. Find where to watch.</Text>
          </View>
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
            <Text style={styles.langToggleText}>{language === 'en' ? 'EN' : 'AR'}</Text>
          </TouchableOpacity>
        </View>

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
            <Text style={styles.highlightBadge}>⭐ Highlight of the Week</Text>
            <View style={styles.highlightBody}>
              {highlight.poster_url ? (
                <Image source={{ uri: highlight.poster_url }} style={styles.highlightPoster} />
              ) : null}
              <View style={styles.highlightText}>
                <Text style={styles.highlightTitle}>{highlight.title}</Text>
                <Text style={styles.highlightDesc} numberOfLines={3}>{highlight.description}</Text>
                {highlight.why_we_picked ? (
                  <Text style={styles.highlightWhy}>"{highlight.why_we_picked}"</Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionLabel}>Choose your region</Text>

        <View style={styles.grid}>
          {regions.map((region) => (
            <TouchableOpacity
              key={region.name}
              style={[styles.card, { backgroundColor: region.cardBg }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EraSelection', { region: region.name })}
            >
              <Text style={styles.emoji}>{region.emoji}</Text>
              <Text style={[styles.label, { color: region.color }]}>{region.name}</Text>
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
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F5E6D0',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#A08060',
    marginTop: 4,
  },
  highlightCard: {
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  highlightBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFAB76',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
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
  },
  highlightTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F5E6D0',
    marginBottom: 6,
  },
  highlightDesc: {
    fontSize: 13,
    color: '#A08060',
    lineHeight: 19,
    marginBottom: 6,
  },
  highlightWhy: {
    fontSize: 12,
    color: '#FFAB76',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  langToggle: {
    backgroundColor: '#2A2A2C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  langToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5E6D0',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B70',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
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
