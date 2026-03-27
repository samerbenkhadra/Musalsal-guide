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
  Romance: { emoji: '💕', color: '#E8A0BF', light: '#2C1A20' },
  Betrayal: { emoji: '🗡️', color: '#E07070', light: '#2C1A1A' },
  Tension: { emoji: '⚡', color: '#B39DDB', light: '#1E1A2C' },
  Drama: { emoji: '🎭', color: '#FFAB76', light: '#2C1E14' },
};

export default function MoodSelectionScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Musalsal Guide</Text>
        <Text style={styles.subtitle}>What are you in the mood for?</Text>

        <View style={styles.grid}>
          {moods.map((mood) => {
            const { emoji, color, light } = moodConfig[mood];
            return (
              <TouchableOpacity
                key={mood}
                style={[styles.card, { backgroundColor: light, borderColor: color }]}
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
    backgroundColor: '#1A0F0A',
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
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
