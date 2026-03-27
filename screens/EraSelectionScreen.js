import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

const eras = [
  { name: 'Classic', emoji: '📼', description: 'Before 2010', color: '#FFAB76', cardBg: '#4A3020' },
  { name: 'Modern', emoji: '📺', description: '2010 – 2019', color: '#B39DDB', cardBg: '#302848' },
  { name: 'Recent', emoji: '🔥', description: '2020 onwards', color: '#E8A0BF', cardBg: '#48202E' },
  { name: 'Ramadan', emoji: '🌙', description: 'Ramadan specials', color: '#7AC9C9', cardBg: '#203848' },
];

export default function EraSelectionScreen({ route, navigation }) {
  const { region } = route.params;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{region}</Text>
        <Text style={styles.subtitle}>Now pick an era</Text>

        <View style={styles.grid}>
          {eras.map((era) => (
            <TouchableOpacity
              key={era.name}
              style={[styles.card, { backgroundColor: era.cardBg }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Recommendations', { region, era: era.name })}
            >
              <Text style={styles.emoji}>{era.emoji}</Text>
              <Text style={[styles.label, { color: era.color }]}>{era.name}</Text>
              <Text style={styles.description}>{era.description}</Text>
            </TouchableOpacity>
          ))}
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
    paddingTop: 32,
  },
  backBtn: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A08060',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F5E6D0',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#A08060',
    marginBottom: 36,
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
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    color: '#6B6B70',
    textAlign: 'center',
  },
});
