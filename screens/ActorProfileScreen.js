import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { fetchPersonDetails, fetchPersonTVCredits, IMAGE_BASE_URL } from '../services/tmdb';
import { getWatchedShows, toggleWatched } from '../services/watchlist';
import { useLanguage } from '../context/LanguageContext';

export default function ActorProfileScreen({ route, navigation }) {
  const { personId, personName, nameAr } = route.params;
  const { language } = useLanguage();
  const [person, setPerson] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [watchedIds, setWatchedIds] = useState(new Set());

  useEffect(() => {
    getWatchedShows().then(setWatchedIds);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [details, credits] = await Promise.all([
        fetchPersonDetails(personId),
        fetchPersonTVCredits(personId, language),
      ]);
      setPerson(details);
      setShows(credits);
      setLoading(false);
    };
    load();
  }, [personId, language]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {language === 'ar' ? 'رجوع' : 'Back'}</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#FFAB76" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.profileHeader}>
              {person?.profile_path ? (
                <Image
                  source={{ uri: `${IMAGE_BASE_URL}${person.profile_path}` }}
                  style={styles.profilePhoto}
                />
              ) : (
                <View style={styles.profilePhotoPlaceholder} />
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{language === 'ar' ? (nameAr || person?.name || personName) : (person?.name || personName)}</Text>
                {person?.birthday ? (
                  <Text style={styles.profileMeta}>{person.birthday.split('-')[0]}</Text>
                ) : null}
                {person?.place_of_birth ? (
                  <Text style={styles.profileMeta}>{person.place_of_birth}</Text>
                ) : null}
                <Text style={styles.profileCredits}>{shows.length} {language === 'ar' ? 'مسلسل' : 'shows'}</Text>
                {(() => {
                  const watchedCount = shows.filter(s => watchedIds.has(s.id)).length;
                  return watchedCount > 0 ? (
                    <Text style={[styles.watchedCount, { color: '#4CAF50', fontStyle: 'normal', fontWeight: '600' }]}>
                      {language === 'ar' ? `شاهدت ${watchedCount} من ${shows.length}` : `You've watched ${watchedCount}/${shows.length}`}
                    </Text>
                  ) : (
                    <Text style={styles.watchedCount}>
                      {language === 'ar' ? 'اضغط ✓ على المسلسلات التي شاهدتها' : "Tap ✓ on shows you've watched"}
                    </Text>
                  );
                })()}
              </View>
            </View>

            {person?.biography ? (
              <>
                <Text style={styles.bio} numberOfLines={bioExpanded ? undefined : 4}>{person.biography}</Text>
                <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)} style={styles.seeMoreBtn}>
                  <Text style={styles.seeMoreText}>{bioExpanded ? (language === 'ar' ? 'عرض أقل ↑' : 'See less ↑') : (language === 'ar' ? 'عرض المزيد ↓' : 'See more ↓')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noBio}>{language === 'ar' ? 'لا توجد سيرة ذاتية متاحة' : 'No biography available.'}</Text>
            )}

            <Text style={styles.sectionTitle}>
              {language === 'ar' ? 'المسلسلات' : 'Shows'}
            </Text>

            <View style={styles.showsGrid}>
              {shows.map((show) => (
                <TouchableOpacity
                  key={show.id}
                  style={styles.showCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('EpisodeDetail', { show, accent: '#FFAB76' })}
                >
                  <View style={styles.showPosterWrapper}>
                    <Image source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.showPoster} />
                    <TouchableOpacity
                      style={[styles.watchedOverlay, watchedIds.has(show.id) && styles.watchedOverlayActive]}
                      onPress={async () => setWatchedIds(await toggleWatched(show.id))}
                    >
                      <Text style={styles.watchedOverlayText}>✓</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.showName} numberOfLines={2}>{show.name}</Text>
                  {show.first_air_date ? (
                    <Text style={styles.showYear}>{show.first_air_date.split('-')[0]}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    color: '#FFAB76',
  },
  profileHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  profilePhoto: {
    width: 100,
    height: 140,
    borderRadius: 12,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#2A2A2C',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F5E6D0',
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 13,
    color: '#A08060',
  },
  profileCredits: {
    fontSize: 13,
    color: '#FFAB76',
    fontWeight: '600',
    marginTop: 6,
  },
  bio: {
    fontSize: 14,
    color: '#A08060',
    lineHeight: 21,
    marginBottom: 6,
  },
  seeMoreBtn: {
    marginBottom: 24,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFAB76',
  },
  noBio: {
    fontSize: 14,
    color: '#6B6B70',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5E6D0',
    marginBottom: 16,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  showCard: {
    width: '30%',
  },
  showPosterWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 2 / 3,
    marginBottom: 6,
  },
  showPoster: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  watchedOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: '#6B6B70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedOverlayActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  watchedOverlayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  watchedCount: {
    fontSize: 12,
    color: '#6B6B70',
    fontStyle: 'italic',
    marginTop: 2,
  },
  showName: {
    fontSize: 12,
    color: '#F5E6D0',
    fontWeight: '600',
    lineHeight: 16,
  },
  showYear: {
    fontSize: 11,
    color: '#6B6B70',
    marginTop: 2,
  },
});
