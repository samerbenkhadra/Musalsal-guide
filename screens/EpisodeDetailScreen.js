import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Linking,
} from 'react-native';
import { IMAGE_BASE_URL } from '../services/tmdb';

export default function EpisodeDetailScreen({ route, navigation }) {
  const { show, accent } = route.params;
  const year = show.first_air_date ? show.first_air_date.split('-')[0] : '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accent }]}>← Back</Text>
        </TouchableOpacity>

        {(show.poster_url || show.poster_path) ? (
          <Image
            source={{ uri: show.poster_url || `${IMAGE_BASE_URL}${show.poster_path}` }}
            style={styles.poster}
          />
        ) : null}

        <View style={styles.metaRow}>
          {year ? (
            <View style={[styles.badge, { backgroundColor: accent + '30', borderColor: accent }]}>
              <Text style={[styles.badgeText, { color: accent }]}>{year}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.showName}>{show.name}</Text>

        <View style={styles.divider} />

        <Section title="About this show" accent={accent}>
          <Text style={styles.bodyText}>
            {show.overview || 'No description available.'}
          </Text>
        </Section>

        <TouchableOpacity
          style={[styles.watchBtn, { backgroundColor: accent }]}
          onPress={() => Linking.openURL(`https://www.google.com/search?q=watch+${encodeURIComponent(show.name)}`)}
        >
          <Text style={styles.watchBtnText}>Where to watch →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, accent, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
  },
  backBtn: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 16,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  showName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F5E6D0',
    lineHeight: 32,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#2E2E30',
    marginVertical: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5E6D0',
    letterSpacing: 0.2,
  },
  sectionBody: {
    backgroundColor: '#2A2A2C',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  bodyText: {
    fontSize: 15,
    color: '#C9A880',
    lineHeight: 24,
  },
  watchBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  watchBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
});
