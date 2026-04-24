import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchShowById, fetchPersonDetails, IMAGE_BASE_URL } from '../services/tmdb';
import { getSavedShowsWithMeta, getWatchedShowsWithMeta, toggleSaved, toggleWatched } from '../services/watchlist';
import { useLanguage } from '../context/LanguageContext';

const COLLECTIONS = [
  {
    id: 'syrian_classics',
    title: 'Syrian Drama Classics',
    titleAr: 'كلاسيكيات الدراما السورية',
    description: 'Iconic shows that defined Syrian television',
    descriptionAr: 'مسلسلات أيقونية شكّلت التلفزيون السوري',
    accent: '#637AC9',
    showIds: [94133, 95355, 95956],
    actorIds: [1259102, 2297163, 2852223, 2361943],
  },
  {
    id: 'turkish_romance',
    title: 'Turkish Romance',
    titleAr: 'الرومانسية التركية',
    description: 'Sweeping love stories from Turkey\'s biggest productions',
    descriptionAr: 'قصص حب ملحمية من أضخم الإنتاجات التركية',
    accent: '#C97A63',
    showIds: [],
    actorIds: [1078769, 142855, 145499, 1424928],
  },
  {
    id: 'lebanese_classics',
    title: 'Lebanese Classics',
    titleAr: 'كلاسيكيات لبنانية',
    description: 'Timeless shows from Lebanese television\'s golden era',
    descriptionAr: 'مسلسلات خالدة من العصر الذهبي للتلفزيون اللبناني',
    accent: '#C96363',
    showIds: [319776, 319779],
    actorIds: [2047345, 225883, 231328],
  },
  {
    id: 'egyptian_legends',
    title: 'Egyptian Legends',
    titleAr: 'أساطير مصرية',
    description: 'The greatest names in Egyptian drama',
    descriptionAr: 'أبرز الأسماء في الدراما المصرية',
    accent: '#C9637A',
    showIds: [],
    actorIds: [13202, 130207, 140869, 232318],
  },
  {
    id: 'gulf_classics',
    title: 'Gulf Classics',
    titleAr: 'كلاسيكيات خليجية',
    description: 'Beloved shows from the Gulf\'s rich drama heritage',
    descriptionAr: 'مسلسلات محبوبة من التراث الدرامي الخليجي',
    accent: '#7AC963',
    showIds: [290649, 283620, 284483, 277991, 251691],
    actorIds: [1412399],
  },
  {
    id: 'turkish_thriller',
    title: 'Turkish Thriller',
    titleAr: 'الإثارة التركية',
    description: 'Edge-of-your-seat drama from Turkey\'s best thriller productions',
    descriptionAr: 'دراما مشوّقة من أفضل الإنتاجات التركية',
    accent: '#B39DDB',
    showIds: [],
    actorIds: [1078769, 1004806, 59764],
  },
];

export default function DiscoverScreen({ navigation }) {
  const { language } = useLanguage();
  const [collectionData, setCollectionData] = useState({});
  const [savedShows, setSavedShows] = useState([]);
  const [watchedShows, setWatchedShows] = useState([]);

  useEffect(() => {
    loadAll();
  }, [language]);

  useFocusEffect(useCallback(() => {
    getSavedShowsWithMeta().then(setSavedShows);
    getWatchedShowsWithMeta().then(setWatchedShows);
  }, []));

  const loadAll = async () => {
    const lang = language === 'ar' ? 'ar' : 'en';
    const results = {};
    await Promise.all(
      COLLECTIONS.map(async (col) => {
        const [shows, actors] = await Promise.all([
          Promise.all(col.showIds.map((id) => fetchShowById(id, lang).catch(() => null))),
          Promise.all(col.actorIds.map((id) => fetchPersonDetails(id, lang).catch(() => null))),
        ]);
        results[col.id] = {
          shows: shows.filter((s) => s && s.poster_path),
          actors: actors.filter(Boolean),
        };
      })
    );
    setCollectionData(results);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>{language === 'ar' ? 'اكتشف' : 'Discover'}</Text>
        <Text style={styles.pageSubtitle}>
          {language === 'ar' ? 'مجموعات مختارة بعناية' : 'Hand-picked collections for you'}
        </Text>

        {/* Saved Shows */}
        {savedShows.length > 0 && (
          <View style={styles.userSection}>
            <Text style={styles.userSectionTitle}>{language === 'ar' ? '🔖 المحفوظة' : '🔖 Saved'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userShowsRow}>
              {savedShows.map((show) => (
                <TouchableOpacity
                  key={show.id}
                  style={styles.userShowItem}
                  onPress={() => navigation.navigate('EpisodeDetail', { show, accent: '#FFAB76' })}
                >
                  {show.poster_path ? (
                    <Image source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.userShowPoster} />
                  ) : (
                    <View style={[styles.userShowPoster, { backgroundColor: '#2A2A2C' }]} />
                  )}
                  <TouchableOpacity
                    style={styles.unsaveBtn}
                    onPress={async () => { await toggleSaved(show.id, show); getSavedShowsWithMeta().then(setSavedShows); }}
                  >
                    <Text style={styles.unsaveBtnText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.userShowName} numberOfLines={2}>{show.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Watched Shows */}
        {watchedShows.length > 0 && (
          <View style={styles.userSection}>
            <Text style={styles.userSectionTitle}>{language === 'ar' ? '✓ شاهدت' : '✓ Watched'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userShowsRow}>
              {watchedShows.map((show) => (
                <TouchableOpacity
                  key={show.id}
                  style={styles.userShowItem}
                  onPress={() => navigation.navigate('EpisodeDetail', { show, accent: '#FFAB76' })}
                >
                  {show.poster_path ? (
                    <Image source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.userShowPoster} />
                  ) : (
                    <View style={[styles.userShowPoster, { backgroundColor: '#2A2A2C' }]} />
                  )}
                  {show.rating ? (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>{'★'.repeat(show.rating)}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.userShowName} numberOfLines={2}>{show.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {COLLECTIONS.map((col) => {
          const data = collectionData[col.id];
          return (
            <View key={col.id} style={styles.collection}>
              <View style={[styles.collectionHeader, { borderLeftColor: col.accent }]}>
                <Text style={[styles.collectionTitle, { color: col.accent }]}>
                  {language === 'ar' ? col.titleAr : col.title}
                </Text>
                <Text style={styles.collectionDesc}>
                  {language === 'ar' ? col.descriptionAr : col.description}
                </Text>
              </View>

              {/* Featured Actors */}
              {data?.actors?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actorsRow}>
                  {data.actors.map((actor) => (
                    <TouchableOpacity
                      key={actor.id}
                      style={styles.actorItem}
                      onPress={() => navigation.navigate('ActorProfile', {
                        personId: actor.id,
                        personName: actor.name,
                        nameAr: language === 'ar' ? actor.name : undefined,
                      })}
                    >
                      {actor.profile_path ? (
                        <Image source={{ uri: `${IMAGE_BASE_URL}${actor.profile_path}` }} style={styles.actorPhoto} />
                      ) : (
                        <View style={styles.actorPhotoPlaceholder} />
                      )}
                      <Text style={styles.actorName} numberOfLines={2}>{actor.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Shows */}
              {!data ? (
                <ActivityIndicator color={col.accent} style={{ marginVertical: 16 }} />
              ) : data.shows.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.showsRow}>
                  {data.shows.map((show) => (
                    <TouchableOpacity
                      key={show.id}
                      style={styles.showItem}
                      onPress={() => navigation.navigate('EpisodeDetail', { show, accent: col.accent })}
                    >
                      <Image source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.showPoster} />
                      <Text style={styles.showName} numberOfLines={2}>{show.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  container: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '600', color: '#FFAB76' },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#F5E6D0', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#A08060', marginBottom: 28 },
  collection: { marginBottom: 32 },
  collectionHeader: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 16 },
  collectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  collectionDesc: { fontSize: 13, color: '#A08060', lineHeight: 18 },
  actorsRow: { gap: 14, paddingBottom: 12 },
  actorItem: { alignItems: 'center', width: 68 },
  actorPhoto: { width: 56, height: 56, borderRadius: 28, marginBottom: 6 },
  actorPhotoPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2A2A2C', marginBottom: 6 },
  actorName: { fontSize: 11, color: '#F5E6D0', textAlign: 'center', lineHeight: 15 },
  showsRow: { gap: 12 },
  showItem: { width: 100 },
  showPoster: { width: 100, height: 150, borderRadius: 10, marginBottom: 6 },
  showName: { fontSize: 11, color: '#C9A880', lineHeight: 15 },
  userSection: { marginBottom: 28 },
  userSectionTitle: { fontSize: 16, fontWeight: '800', color: '#F5E6D0', marginBottom: 12 },
  userShowsRow: { gap: 12, paddingBottom: 4 },
  userShowItem: { width: 90, position: 'relative' },
  userShowPoster: { width: 90, height: 135, borderRadius: 10, marginBottom: 6 },
  userShowName: { fontSize: 11, color: '#C9A880', lineHeight: 15 },
  unsaveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsaveBtnText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  ratingBadge: {
    position: 'absolute',
    bottom: 28,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  ratingBadgeText: { fontSize: 9, color: '#FFD166' },
});
