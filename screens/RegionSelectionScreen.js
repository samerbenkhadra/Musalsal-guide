import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { fetchHighlight, fetchActorNameOverrides } from '../services/supabase';
import { fetchShowById, searchPerson, IMAGE_BASE_URL } from '../services/tmdb';
import { useLanguage } from '../context/LanguageContext';

const POPULAR_ACTORS = [
  // Lebanese
  { id: 2047345, name: 'Nadine Njeim' },
  { id: 225883, name: 'Carmen Lebbos' },
  { id: 231328, name: 'Takla Chamoun' },
  { id: 2047355, name: 'Pamela Kik' },
  { id: 2804039, name: 'Carmen Bsaibes' },
  { id: 3790379, name: 'Nour Ali' },
  { id: 230739, name: 'Cyrine Abdel Nour' },
  { id: 1326619, name: 'Carol Abboud' },
  { id: 108828, name: 'Georges Khabbaz' },
  // Egyptian
  { id: 13202, name: 'Adel Emam' },
  { id: 130206, name: 'Yousra' },
  { id: 130207, name: 'Mona Zaki' },
  { id: 127782, name: 'Nour' },
  { id: 226438, name: 'Hend Sabry' },
  { id: 140869, name: 'Karim Abdel Aziz' },
  { id: 232318, name: 'Ahmed Ezz' },
  // Syrian
  { id: 1259102, name: 'Tim Hassan' },
  { id: 2297163, name: 'Maxim Khalil' },
  { id: 2852223, name: 'Sulaf Fawakherji' },
  { id: 2361943, name: 'Bassem Yakhour' },
  { id: 1260464, name: 'Amal Arafa' },
  // Gulf
  { id: 1412399, name: 'Fahad Albutairi' },
  { id: 5622935, name: 'Haya Al-Shuaibi' },
  // Turkish
  { id: 1078769, name: 'Kıvanç Tatlıtuğ' },
  { id: 1424928, name: 'Burak Özçivit' },
  { id: 142855, name: 'Tuba Büyüküstün' },
  { id: 145499, name: 'Beren Saat' },
  { id: 239258, name: 'Hazal Kaya' },
  { id: 120879, name: 'Engin Altan Düzyatan' },
  { id: 59764, name: 'Halit Ergenç' },
];

const regions = [
  { name: 'Egyptian', nameAr: 'مصري', emoji: '🇪🇬', color: '#C9637A', cardBg: '#52303C' },
  { name: 'Turkish', nameAr: 'تركي', emoji: '🇹🇷', color: '#C97A63', cardBg: '#523830' },
  { name: 'Gulf', nameAr: 'خليجي', emoji: '🇸🇦', color: '#7AC963', cardBg: '#305238' },
  { name: 'Syrian', nameAr: 'سوري', emoji: '🇸🇾', color: '#637AC9', cardBg: '#303852' },
  { name: 'Lebanese', nameAr: 'لبناني', emoji: '🇱🇧', color: '#C96363', cardBg: '#523030' },
  { name: 'All Arabic', nameAr: 'كل العربي', emoji: '🌍', color: '#B39DDB', cardBg: '#30304A' },
];

export default function RegionSelectionScreen({ navigation }) {
  const [highlight, setHighlight] = useState(null);
  const [browseMode, setBrowseMode] = useState('actor');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [popularActors, setPopularActors] = useState([]);
  const [actorNameOverrides, setActorNameOverrides] = useState({});
  const { language, toggleLanguage } = useLanguage();

  useEffect(() => {
    fetchHighlight().then(setHighlight);
    fetchActorNameOverrides().then(setActorNameOverrides);
    loadPopularActors(language);
  }, []);

  useEffect(() => {
    loadPopularActors(language);
  }, [language]);

  const loadPopularActors = async (lang = 'en') => {
    const results = await Promise.all(
      POPULAR_ACTORS.map(async (a) => {
        const res = await fetch(`https://api.themoviedb.org/3/person/${a.id}?api_key=df249df3a0df066640d620b5d876ef69&language=${lang}`);
        return await res.json();
      })
    );
    setPopularActors(results.filter(Boolean));
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchPerson(text, language);
    setSearchResults(results.slice(0, 6));
    setSearching(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MusalsalGo</Text>
            <Text style={styles.subtitle}>
              {language === 'ar' ? 'اكتشف مسلسلات الشرق الأوسط. اعرف أين تشاهدها.' : 'Discover Middle Eastern TV. Find where to watch.'}
            </Text>
          </View>
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              onPress={() => language !== 'en' && toggleLanguage()}
            >
              <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
              onPress={() => language !== 'ar' && toggleLanguage()}
            >
              <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>AR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Highlight of the Week */}
        {highlight ? (
          <TouchableOpacity
            style={styles.highlightCard}
            activeOpacity={0.85}
            onPress={async () => {
              const show = highlight.tmdb_id
                ? await fetchShowById(highlight.tmdb_id)
                : { name: highlight.title, overview: highlight.description, poster_url: highlight.poster_url };
              navigation.navigate('EpisodeDetail', { show, accent: '#FFAB76' });
            }}
          >
            <View style={styles.highlightBody}>
              {highlight.poster_url ? (
                <Image source={{ uri: highlight.poster_url }} style={styles.highlightPoster} />
              ) : null}
              <View style={styles.highlightText}>
                <Text style={styles.highlightBadge}>⭐ {language === 'ar' ? 'أبرز مسلسل الأسبوع' : 'Highlight of the Week'}</Text>
                <Text style={styles.highlightTitle}>{highlight.title}</Text>
                {highlight.why_we_picked ? (
                  <Text style={styles.highlightWhy} numberOfLines={2}>"{highlight.why_we_picked}"</Text>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Browse Mode Toggle */}
        <View style={styles.browseToggle}>
          <TouchableOpacity
            style={[styles.browseBtn, browseMode === 'actor' && styles.browseBtnActive]}
            onPress={() => setBrowseMode('actor')}
          >
            <Text style={[styles.browseBtnText, browseMode === 'actor' && styles.browseBtnTextActive]}>
              {language === 'ar' ? 'تصفح بالممثل' : 'Browse by Actor'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.browseBtn, browseMode === 'region' && styles.browseBtnActive]}
            onPress={() => setBrowseMode('region')}
          >
            <Text style={[styles.browseBtnText, browseMode === 'region' && styles.browseBtnTextActive]}>
              {language === 'ar' ? 'تصفح بالمنطقة' : 'Browse by Region'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actor Browse */}
        {browseMode === 'actor' && (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder={language === 'ar' ? 'ابحث عن ممثل أو ممثلة...' : 'Search for an actor or actress...'}
              placeholderTextColor="#6B6B70"
              value={searchQuery}
              onChangeText={handleSearch}
            />

            {searching && <ActivityIndicator size="small" color="#FFAB76" style={{ marginVertical: 8 }} />}

            {searchResults.length > 0 ? (
              <View style={styles.searchResults}>
                {searchResults.map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      navigation.navigate('ActorProfile', { personId: person.id, personName: person.name, nameAr: language === 'ar' ? person.name : undefined });
                    }}
                  >
                    {person.profile_path ? (
                      <Image source={{ uri: `${IMAGE_BASE_URL}${person.profile_path}` }} style={styles.searchResultPhoto} />
                    ) : (
                      <View style={styles.searchResultPhotoPlaceholder} />
                    )}
                    <View>
                      <Text style={styles.searchResultName}>{person.name}</Text>
                      <Text style={styles.searchResultKnown}>{person.known_for_department}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {searchResults.length === 0 && !searching && (
              <>
              <Text style={styles.swipeHint}>{language === 'ar' ? 'اسحب لرؤية المزيد ←' : 'swipe to see more →'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularActors}>
                {popularActors.map((actor) => (
                  <TouchableOpacity
                    key={actor.id}
                    style={styles.actorChip}
                    onPress={() => navigation.navigate('ActorProfile', { personId: actor.id, personName: actor.name, nameAr: actorNameOverrides[actor.id] || actor.name })}
                  >
                    {actor.profile_path ? (
                      <Image source={{ uri: `${IMAGE_BASE_URL}${actor.profile_path}` }} style={styles.actorPhoto} />
                    ) : (
                      <View style={styles.actorPhotoPlaceholder} />
                    )}
                    <Text style={styles.actorName} numberOfLines={2}>
                      {language === 'ar' ? (actorNameOverrides[actor.id] || actor.name) : actor.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              </>
            )}
          </>
        )}

        {/* Region Browse */}
        {browseMode === 'region' && (
          <>
            <Text style={styles.regionNote}>
              {language === 'ar' ? 'تصفح حسب بلد الإنتاج' : 'Browse shows by country of origin'}
            </Text>
            <View style={styles.grid}>
              {regions.map((region) => (
                <TouchableOpacity
                  key={region.name}
                  style={[styles.card, { backgroundColor: region.cardBg }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('EraSelection', { region: region.name })}
                >
                  <Text style={styles.emoji}>{region.emoji}</Text>
                  <Text style={[styles.label, { color: region.color }]}>{language === 'ar' ? region.nameAr : region.name}</Text>
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
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  container: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#F5E6D0', letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#A08060', marginTop: 4, maxWidth: 240 },
  langToggle: { flexDirection: 'row', backgroundColor: '#2A2A2C', borderRadius: 8, padding: 3 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#F5E6D0' },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#6B6B70' },
  langBtnTextActive: { color: '#1C1C1E' },
  highlightCard: { backgroundColor: '#2A2A2C', borderRadius: 16, padding: 16, marginBottom: 24 },
  highlightBody: { flexDirection: 'row', gap: 12 },
  highlightPoster: { width: 70, height: 105, borderRadius: 8 },
  highlightText: { flex: 1, justifyContent: 'center' },
  highlightBadge: { fontSize: 11, fontWeight: '700', color: '#FFAB76', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  highlightTitle: { fontSize: 17, fontWeight: '800', color: '#F5E6D0', marginBottom: 6 },
  highlightWhy: { fontSize: 12, color: '#FFAB76', fontStyle: 'italic', lineHeight: 17 },
  browseToggle: { flexDirection: 'row', backgroundColor: '#2A2A2C', borderRadius: 12, padding: 4, marginBottom: 20 },
  browseBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  browseBtnActive: { backgroundColor: '#FFAB76' },
  browseBtnText: { fontSize: 14, fontWeight: '700', color: '#6B6B70' },
  browseBtnTextActive: { color: '#1C1C1E' },
  searchInput: { backgroundColor: '#2A2A2C', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#F5E6D0', fontSize: 14, marginBottom: 8 },
  searchResults: { backgroundColor: '#2A2A2C', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#1C1C1E' },
  searchResultPhoto: { width: 40, height: 40, borderRadius: 20 },
  searchResultPhotoPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3A3A3C' },
  searchResultName: { fontSize: 14, fontWeight: '600', color: '#F5E6D0' },
  searchResultKnown: { fontSize: 12, color: '#6B6B70' },
  swipeHint: { fontSize: 11, color: '#6B6B70', fontStyle: 'italic', marginBottom: 8, textAlign: 'right' },
  popularActors: { marginBottom: 8 },
  actorChip: { alignItems: 'center', marginRight: 16, width: 90 },
  actorPhoto: { width: 82, height: 82, borderRadius: 41, marginBottom: 8 },
  actorPhotoPlaceholder: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#2A2A2C', marginBottom: 8 },
  actorName: { fontSize: 12, color: '#F5E6D0', textAlign: 'center', lineHeight: 16 },
  regionNote: { fontSize: 13, color: '#A08060', marginBottom: 14, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  card: { width: '47%', aspectRatio: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  emoji: { fontSize: 40, marginBottom: 10 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
