import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { fetchShows, fetchLatestEpisode, IMAGE_BASE_URL } from '../services/tmdb';
import SkeletonCard from '../components/SkeletonCard';

const eraColor = {
  Classic: '#FFAB76',
  Modern: '#B39DDB',
  Recent: '#E8A0BF',
  Ramadan: '#7AC9C9',
};

export default function RecommendationsScreen({ route, navigation }) {
  const { region, era } = route.params;
  const accent = eraColor[era] || '#F5E6D0';
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShows(region, era).then(async (data) => {
      const withEpisodes = await Promise.all(
        data.map(async (show) => {
          const latestEpisode = await fetchLatestEpisode(show.id);
          return { ...show, latestEpisode };
        })
      );
      setShows(withEpisodes);
      setLoading(false);
    });
  }, [region, era]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{region}</Text>
        <Text style={styles.headerSub}>{era} shows</Text>
      </View>

      {loading ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : shows.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No shows found. Try a different combination.</Text>
        </View>
      ) : (
        <FlatList
          data={shows}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('EpisodeDetail', { show: item, accent })}
            >
              <View style={[styles.accentBar, { backgroundColor: accent }]} />
              {item.poster_path ? (
                <Image
                  source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }}
                  style={styles.poster}
                />
              ) : null}
              <View style={styles.cardContent}>
                <Text style={styles.showName} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.meta, { color: accent }]}>
                  {item.first_air_date ? item.first_air_date.split('-')[0] : ''}
                  {item.vote_average ? `  ⭐ ${item.vote_average.toFixed(1)}` : ''}
                </Text>
                {item.latestEpisode && !(item.latestEpisode.season_number === 1 && item.latestEpisode.episode_number === 1) ? (
                  <View style={styles.episodeBadge}>
                    <Text style={[styles.episodeBadgeText, { color: accent }]}>
                      Latest: S{item.latestEpisode.season_number} E{item.latestEpisode.episode_number}
                    </Text>
                    <Text style={styles.episodeName} numberOfLines={1}>
                      {item.latestEpisode.name}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.readMore, { color: accent }]}>Read more →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E30',
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F5E6D0',
  },
  headerSub: {
    fontSize: 14,
    color: '#A08060',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#A08060',
    fontSize: 15,
    textAlign: 'center',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 14,
  },
  accentBar: {
    width: 4,
  },
  poster: {
    width: 70,
    height: 105,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  showName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5E6D0',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#A08060',
    lineHeight: 18,
    marginBottom: 8,
  },
  episodeBadge: {
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
    padding: 6,
    marginBottom: 8,
  },
  episodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  episodeName: {
    fontSize: 11,
    color: '#F5E6D0',
  },
  readMore: {
    fontSize: 12,
    fontWeight: '600',
  },
});
