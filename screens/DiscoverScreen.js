import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Image, ActivityIndicator, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { fetchLibraryShowIds, fetchTitleOverrides, fetchBlockedShows, fetchCategoryShows, searchTitleOverrides } from '../services/supabase';
import { IMAGE_BASE_URL, searchShowsGlobal, fetchTMDBSection, fetchShowById } from '../services/tmdb';
import { getSavedShows, toggleSaved } from '../services/watchlist';
import { useLanguage } from '../context/LanguageContext';
import { usePostHog } from 'posthog-react-native';
import Skeleton from '../components/Skeleton';

function DiscoverSkeleton() {
  return (
    <View style={{ paddingTop: 8 }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ marginBottom: 28 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
            <Skeleton width={130} height={18} borderRadius={6} style={{ marginBottom: 6 }} />
            <Skeleton width={90} height={11} borderRadius={4} />
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 12 }}>
            {[0, 1, 2, 3, 4].map(j => (
              <View key={j} style={{ width: 100 }}>
                <Skeleton width={100} height={150} borderRadius={10} style={{ marginBottom: 6 }} />
                <Skeleton width={70} height={10} borderRadius={4} style={{ marginBottom: 3 }} />
                <Skeleton width={50} height={10} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function DiscoverScreen({ navigation }) {
  const posthog = usePostHog();
  const { language, toggleLanguage } = useLanguage();
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [libraryIds, setLibraryIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  const handleBookmark = (show) => {
    const id = show.id;
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    toggleSaved(id, show);
  };

  useEffect(() => { loadAll(language); getSavedShows().then(setSavedIds); }, []);
  useEffect(() => { loadAll(language); }, [language]);

  const fetchFresh = async (lang) => {
    try {
      const [libIds, titleMap, tmdbRecent, tmdbPopular, tmdbOld, tmdbUpcoming, oldLibIds, blockedIds] = await Promise.all([
        fetchLibraryShowIds(),
        fetchTitleOverrides(),
        fetchTMDBSection('recent', lang),
        fetchTMDBSection('popular', lang),
        fetchTMDBSection('old', lang),
        fetchTMDBSection('upcoming', lang),
        fetchCategoryShows('old'),
        fetchBlockedShows(),
      ]);
      setLibraryIds(libIds);

      const applyOverrides = (shows) => shows.map(s => titleMap[s.id] ? { ...s, name: titleMap[s.id] } : s);
      const filtered = (shows) => applyOverrides(shows.filter(s => !blockedIds.has(s.id)));

      const apiLang = lang === 'ar' ? 'ar' : 'en';

      // Supplement Classics with curated library shows TMDB missed
      const tmdbOldIds = new Set(tmdbOld.map(s => s.id));
      const missingIds = oldLibIds.filter(id => !tmdbOldIds.has(id) && !blockedIds.has(id));
      const missingShows = [];
      for (let i = 0; i < missingIds.length; i += 20) {
        const batch = missingIds.slice(i, i + 20);
        const results = await Promise.all(batch.map(id => fetchShowById(id, apiLang).catch(() => null)));
        results.forEach(show => { if (show?.poster_path) missingShows.push(titleMap[show.id] ? { ...show, name: titleMap[show.id] } : show); });
      }

      // Supplement New Releases with non-Turkish library shows TMDB's discover missed
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const recentThreshold = sixMonthsAgo.toISOString().split('T')[0];
      const tmdbRecentIds = new Set(tmdbRecent.map(s => s.id));
      const missingRecentIds = [...libIds].filter(id => !tmdbRecentIds.has(id) && !blockedIds.has(id));
      const missingRecentShows = [];
      for (let i = 0; i < missingRecentIds.length; i += 20) {
        const batch = missingRecentIds.slice(i, i + 20);
        const results = await Promise.all(batch.map(id => fetchShowById(id, apiLang).catch(() => null)));
        results.forEach(show => {
          if (show?.poster_path && (show.first_air_date || '') >= recentThreshold) {
            missingRecentShows.push(titleMap[show.id] ? { ...show, name: titleMap[show.id] } : show);
          }
        });
      }

      const baseRecent = filtered(tmdbRecent);
      const combined = [...baseRecent, ...missingRecentShows]
        .filter((s, i, a) => a.findIndex(x => x.id === s.id) === i)
        .sort((a, b) => (b.first_air_date || '').localeCompare(a.first_air_date || ''));

      // Interleave Arabic and Turkish so neither dominates
      const arRecent = combined.filter(s => s.original_language !== 'tr');
      const trRecent = combined.filter(s => s.original_language === 'tr');
      const allRecent = [];
      for (let i = 0; i < Math.max(arRecent.length, trRecent.length); i++) {
        if (i < arRecent.length) allRecent.push(arRecent[i]);
        if (i < trRecent.length) allRecent.push(trRecent[i]);
      }

      const newSections = {
        recent: allRecent,
        upcoming: filtered(tmdbUpcoming),
        popular: filtered(tmdbPopular),
        old: [...filtered(tmdbOld), ...missingShows],
      };
      setSections(newSections);
      try {
        await AsyncStorage.setItem(`discover_v6_${lang}`, JSON.stringify({ sections: newSections, timestamp: Date.now() }));
      } catch {}
    } catch (e) {
      console.log('Discover load error:', e);
    }
    setLoading(false);
  };

  const loadAll = async (lang) => {
    try {
      const raw = await AsyncStorage.getItem(`discover_v6_${lang}`);
      if (raw) {
        const { sections: cached, timestamp } = JSON.parse(raw);
        setSections(cached);
        setLoading(false);
        if (Date.now() - timestamp > 60 * 60 * 1000) fetchFresh(lang);
        return;
      }
    } catch {}
    setLoading(true);
    fetchFresh(lang);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      posthog?.capture('discover_search', { query: text });
      const apiLang = language === 'ar' ? 'ar' : 'en';
      const [tmdbResults, overrideMatches] = await Promise.all([
        searchShowsGlobal(text, language, libraryIds),
        searchTitleOverrides(text),
      ]);
      const tmdbIds = new Set(tmdbResults.map(s => s.id));
      const missing = overrideMatches.filter(r => !tmdbIds.has(r.show_id));
      const extraShows = await Promise.all(missing.map(r => fetchShowById(r.show_id, apiLang).catch(() => null)));
      const extras = extraShows
        .filter(s => s?.poster_path)
        .map(s => {
          const ov = overrideMatches.find(r => r.show_id === s.id);
          return ov ? { ...s, name: ov.title_en } : s;
        });
      setSearchResults([...extras, ...tmdbResults]);
      setSearchLoading(false);
    }, 500);
  };

  const renderShowCard = (show, accent = '#FFAB76') => (
    <TouchableOpacity
      key={show.id}
      style={styles.showCard}
      onPress={() => navigation.navigate('EpisodeDetail', { show, accent })}
    >
      <View style={styles.posterWrapper}>
        <Image source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.showPoster} />
        <TouchableOpacity
          style={[styles.bookmarkOverlay, savedIds.has(show.id) && styles.bookmarkOverlayActive]}
          onPress={() => handleBookmark(show)}
        >
          <Ionicons name={savedIds.has(show.id) ? 'bookmark' : 'bookmark-outline'} size={10} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.showName} numberOfLines={2}>{show.name}</Text>
    </TouchableOpacity>
  );

  const renderSection = (title, shows, accent, emoji, type, subtitle, categorySubtitle) => {
    if (!shows || shows.length === 0) return null;
    return (
      <View style={styles.section} key={title}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Category', { title, accent, shows, subtitle: categorySubtitle || subtitle })}>
            <Text style={[styles.seeAll, { color: accent }]}>{language === 'ar' ? 'عرض الكل' : 'See all'} →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionRow}>
          {shows.slice(0, 10).map(show => renderShowCard(show, accent))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>MusalsalGo</Text>
          <Text style={styles.subtitle}>{language === 'ar' ? 'اكتشف مسلسلات الشرق الأوسط.' : 'Discover Middle Eastern TV.'}</Text>
        </View>
        <View style={styles.langToggle}>
          <TouchableOpacity style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => language !== 'en' && toggleLanguage()}>
            <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langBtn, language === 'ar' && styles.langBtnActive]} onPress={() => language !== 'ar' && toggleLanguage()}>
            <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>AR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={language === 'ar' ? '🔍 ابحث عن أي مسلسل...' : '🔍 Search any show...'}
          placeholderTextColor="#6B6B70"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} style={styles.searchClear}>
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length > 0 ? (
        <ScrollView contentContainerStyle={styles.searchResults} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {searchLoading ? (
            <ActivityIndicator color="#FFAB76" style={{ marginTop: 20 }} />
          ) : searchResults.length === 0 ? (
            <Text style={styles.noResults}>{language === 'ar' ? 'لا نتائج' : 'No results found'}</Text>
          ) : (
            searchResults.map(show => (
              <TouchableOpacity
                key={show.id}
                style={styles.searchResultItem}
                onPress={() => navigation.navigate('EpisodeDetail', { show, accent: '#FFAB76' })}
              >
                <Image source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.searchResultPoster} />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName} numberOfLines={2}>{show.name}</Text>
                  {show.first_air_date && <Text style={styles.searchResultYear}>{show.first_air_date.split('-')[0]}</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {loading ? (
            <DiscoverSkeleton />
          ) : (
            <>
              {renderSection(language === 'ar' ? 'إصدارات جديدة' : 'New Releases', sections.recent, '#FFAB76', null, 'recent', language === 'ar' ? 'مسلسلات صدرت في آخر 6 أشهر' : 'Shows released in the last 6 months', language === 'ar' ? 'عبر جميع المنصات' : 'Across all platforms')}
              {renderSection(language === 'ar' ? 'الأكثر مشاهدة' : 'Most Popular', sections.popular, '#B39DDB', null, 'popular', language === 'ar' ? 'أكثر المسلسلات مشاهدةً على الإطلاق' : 'The most watched shows of all time')}
              {renderSection(language === 'ar' ? 'قادمًا قريبًا' : 'Upcoming', sections.upcoming, '#4DB6AC', null, 'upcoming', language === 'ar' ? 'تُعرض خلال الأشهر الستة القادمة' : 'Airing in the next 6 months')}
              {renderSection(language === 'ar' ? 'العصر الذهبي' : 'Golden Era', sections.old, '#FFD166', null, 'old', language === 'ar' ? 'مسلسلات من قبل عام 2000' : 'Shows from before the year 2000')}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#F5E6D0', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#A08060', marginTop: 2 },
  langToggle: { flexDirection: 'row', backgroundColor: '#2A2A2C', borderRadius: 8, padding: 3 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#F5E6D0' },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#6B6B70' },
  langBtnTextActive: { color: '#1C1C1E' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 16, backgroundColor: '#2A2A2C', borderRadius: 12, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: '#F5E6D0', fontSize: 14, paddingVertical: 12 },
  searchClear: { padding: 6 },
  searchClearText: { color: '#6B6B70', fontSize: 14 },
  searchResults: { paddingHorizontal: 24, paddingBottom: 32 },
  noResults: { color: '#6B6B70', textAlign: 'center', marginTop: 40, fontSize: 14 },
  searchResultItem: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' },
  searchResultPoster: { width: 52, height: 78, borderRadius: 8 },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 15, fontWeight: '700', color: '#F5E6D0', marginBottom: 4 },
  searchResultYear: { fontSize: 12, color: '#6B6B70', marginBottom: 6 },
  scroll: { paddingBottom: 40 },
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#F5E6D0' },
  sectionSubtitle: { fontSize: 12, color: '#6B6B70', marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  sectionRow: { paddingHorizontal: 24, gap: 12 },
  showCard: { width: 100 },
  posterWrapper: { position: 'relative', width: 100, height: 150 },
  showPoster: { width: 100, height: 150, borderRadius: 10, marginBottom: 6 },
  bookmarkOverlay: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  bookmarkOverlayActive: { backgroundColor: '#637AC9' },
  showName: { fontSize: 11, color: '#C9A880', lineHeight: 15, marginTop: 6 },
});
