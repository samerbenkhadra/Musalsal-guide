import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

export default function EpisodeDetailScreen({ route, navigation }) {
  const { episode, accent } = route.params;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accent }]}>← Back</Text>
        </TouchableOpacity>

        <View style={[styles.badge, { backgroundColor: accent + '20', borderColor: accent }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{episode.episode}</Text>
        </View>

        <Text style={styles.showName}>{episode.showName}</Text>
        <Text style={styles.tagline}>{episode.description}</Text>

        <View style={styles.divider} />

        <Section title="Episode Summary" accent={accent}>
          <Text style={styles.bodyText}>{episode.fullSummary}</Text>
        </Section>

        <Section title="Relationship Dynamics" accent={accent}>
          <Text style={styles.bodyText}>{episode.relationshipDynamics}</Text>
        </Section>
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
    backgroundColor: '#1A0F0A',
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
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  showName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F5E6D0',
    lineHeight: 34,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#A08060',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#2E1E14',
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
    backgroundColor: '#2A1710',
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
});
