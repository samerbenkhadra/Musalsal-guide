import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { moods } from '../data/mockData';

const moodConfig = {
  Romance: { emoji: '💕', color: '#E8C8D0', cardBg: '#52303C' },
  Betrayal: { emoji: '🗡️', color: '#C8C4DC', cardBg: '#302840' },
  Tension: { emoji: '⚡', color: '#B8D0D8', cardBg: '#1E3844' },
  Drama: { emoji: '🎭', color: '#E0CCBC', cardBg: '#4A3020' },
};

export default function MoodSelectionScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>MusalsalGo</Text>
        <Text style={styles.subtitle}>Pick your mood. Find your episode.</Text>

        <View style={styles.grid}>
          {moods.map((mood) => {
            const { emoji, color, cardBg } = moodConfig[mood];
            return (
              <TouchableOpacity
                key={mood}
                style={[styles.card, { backgroundColor: cardBg }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Recommendations', { mood })}
              >
                <Text style={styles.emoji}>{emoji}</Text>
                <Text style={[styles.moodLabel, { color }]}>{mood}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F5E6D0',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A08060',
    marginBottom: 48,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
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
    fontSize: 44,
    marginBottom: 12,
  },
  moodLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
