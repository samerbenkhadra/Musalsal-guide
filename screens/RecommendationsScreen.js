import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { recommendations } from '../data/mockData';

const moodColor = {
  Romance: '#E8A0BF',
  Betrayal: '#E07070',
  Tension: '#B39DDB',
  Drama: '#FFAB76',
};

export default function RecommendationsScreen({ route, navigation }) {
  const { mood } = route.params;
  const episodes = recommendations[mood];
  const accent = moodColor[mood];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mood}</Text>
        <Text style={styles.headerSub}>Top picks for you</Text>
      </View>

      <FlatList
        data={episodes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EpisodeDetail', { episode: item, accent })}
          >
            <View style={[styles.accentBar, { backgroundColor: accent }]} />
            <View style={styles.cardContent}>
              <Text style={styles.showName}>{item.showName}</Text>
              <Text style={[styles.episode, { color: accent }]}>{item.episode}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={[styles.readMore, { color: accent }]}>Read more →</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1A0F0A',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#1A0F0A',
    borderBottomWidth: 1,
    borderBottomColor: '#2E1E14',
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
  list: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: '#2A1710',
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
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  showName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5E6D0',
    marginBottom: 2,
  },
  episode: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#A08060',
    lineHeight: 20,
    marginBottom: 8,
  },
  readMore: {
    fontSize: 13,
    fontWeight: '600',
  },
});
