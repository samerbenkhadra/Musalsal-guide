import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Image, TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchActorNameOverrides } from '../services/supabase';
import { searchPerson, IMAGE_BASE_URL } from '../services/tmdb';
import { useLanguage } from '../context/LanguageContext';
import { usePostHog } from 'posthog-react-native';

const POPULAR_ACTORS = [
  { id: 2047345, name: 'Nadine Njeim', flag: '🇱🇧' },
  { id: 225883, name: 'Carmen Lebbos', flag: '🇱🇧' },
  { id: 231328, name: 'Takla Chamoun', flag: '🇱🇧' },
  { id: 2047355, name: 'Pamela Kik', flag: '🇱🇧' },
  { id: 2804039, name: 'Carmen Bsaibes', flag: '🇱🇧' },
  { id: 3790379, name: 'Nour Ali', flag: '🇱🇧' },
  { id: 230739, name: 'Cyrine Abdel Nour', flag: '🇱🇧' },
  { id: 1326619, name: 'Carol Abboud', flag: '🇱🇧' },
  { id: 108828, name: 'Georges Khabbaz', flag: '🇱🇧' },
  { id: 13202, name: 'Adel Emam', flag: '🇪🇬' },
  { id: 130206, name: 'Yousra', flag: '🇪🇬' },
  { id: 130207, name: 'Mona Zaki', flag: '🇪🇬' },
  { id: 127782, name: 'Nour', flag: '🇪🇬' },
  { id: 226438, name: 'Hend Sabry', flag: '🇪🇬' },
  { id: 140869, name: 'Karim Abdel Aziz', flag: '🇪🇬' },
  { id: 232318, name: 'Ahmed Ezz', flag: '🇪🇬' },
  { id: 238566, name: 'Nour El-Sherif', flag: '🇪🇬' },
  { id: 1448354, name: 'Poussi', flag: '🇪🇬' },
  { id: 238568, name: 'Hussein Fahmy', flag: '🇪🇬' },
  { id: 1299990, name: 'Soad Hosny', flag: '🇪🇬' },
  { id: 1259102, name: 'Tim Hassan', flag: '🇸🇾' },
  { id: 2297163, name: 'Maxim Khalil', flag: '🇸🇾' },
  { id: 2852223, name: 'Sulaf Fawakherji', flag: '🇸🇾' },
  { id: 2361943, name: 'Bassem Yakhour', flag: '🇸🇾' },
  { id: 1260464, name: 'Amal Arafa', flag: '🇸🇾' },
  { id: 1808074, name: 'Bassel Khayyat', flag: '🇸🇾' },
  { id: 70577, name: 'Ghassan Massoud', flag: '🇸🇾' },
  { id: 1250791, name: 'Kosai Khauli', flag: '🇸🇾' },
  { id: 1934213, name: 'Mona Wassef', flag: '🇸🇾' },
  { id: 1083478, name: 'Sabah Jazairi', flag: '🇸🇾' },
  { id: 4090960, name: 'Maram Ali', flag: '🇸🇾' },
  { id: 1412399, name: 'Fahad Albutairi', flag: '🇸🇦' },
  { id: 1078769, name: 'Kıvanç Tatlıtuğ', flag: '🇹🇷' },
  { id: 1424928, name: 'Burak Özçivit', flag: '🇹🇷' },
  { id: 142855, name: 'Tuba Büyüküstün', flag: '🇹🇷' },
  { id: 145499, name: 'Beren Saat', flag: '🇹🇷' },
  { id: 239258, name: 'Hazal Kaya', flag: '🇹🇷' },
  { id: 120879, name: 'Engin Altan Düzyatan', flag: '🇹🇷' },
  { id: 59764, name: 'Halit Ergenç', flag: '🇹🇷' },
  { id: 1397246, name: 'Barış Arduç', flag: '🇹🇷' },
  { id: 1004806, name: 'Engin Akyürek', flag: '🇹🇷' },
  { id: 134497, name: 'Kerem Bürsin', flag: '🇹🇷' },
  { id: 99314, name: 'Yılmaz Erdoğan', flag: '🇹🇷' },
  { id: 1254465, name: 'Neslihan Atagül', flag: '🇹🇷' },
  { id: 1527369, name: 'Esra Bilgiç', flag: '🇹🇷' },
];

export default function ActorBrowseScreen({ navigation }) {
  const posthog = usePostHog();
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [popularActors, setPopularActors] = useState([]);
  const [actorNameOverrides, setActorNameOverrides] = useState({});

  useEffect(() => {
    fetchActorNameOverrides().then(setActorNameOverrides);
    loadPopularActors(language);
  }, []);

  useEffect(() => { loadPopularActors(language); }, [language]);

  const loadPopularActors = async (lang = 'en') => {
    try {
      const raw = await AsyncStorage.getItem(`actor_profiles_v1_${lang}`);
      if (raw) {
        const { actors, timestamp } = JSON.parse(raw);
        setPopularActors(actors);
        if (Date.now() - timestamp > 24 * 60 * 60 * 1000) fetchFreshActors(lang);
        return;
      }
    } catch {}
    fetchFreshActors(lang);
  };

  const fetchFreshActors = async (lang = 'en') => {
    const results = await Promise.all(
      POPULAR_ACTORS.map(async (a) => {
        const res = await fetch(`https://api.themoviedb.org/3/person/${a.id}?api_key=df249df3a0df066640d620b5d876ef69&language=${lang}`);
        const data = await res.json();
        return data ? { ...data, flag: a.flag } : null;
      })
    );
    const sorted = results.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
    setPopularActors(sorted);
    try {
      await AsyncStorage.setItem(`actor_profiles_v1_${lang}`, JSON.stringify({ actors: sorted, timestamp: Date.now() }));
    } catch {}
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{language === 'ar' ? 'تصفح بالممثل' : 'Browse by Actor'}</Text>
        <Text style={styles.subtitle}>{language === 'ar' ? 'اختياراتنا الشعبية. ابحث للعثور على المزيد.' : 'Our popular picks. Search to find more.'}</Text>
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
            {searchResults.map(person => (
              <TouchableOpacity
                key={person.id}
                style={styles.searchResultItem}
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  navigation.navigate('ActorProfile', { personId: person.id, personName: person.name, nameAr: language === 'ar' ? person.name : undefined });
                }}
              >
                {person.profile_path
                  ? <Image source={{ uri: `${IMAGE_BASE_URL}${person.profile_path}` }} style={styles.searchResultPhoto} />
                  : <View style={styles.searchResultPhotoPlaceholder} />}
                <View>
                  <Text style={styles.searchResultName}>{person.name}</Text>
                  <Text style={styles.searchResultKnown}>{person.known_for_department}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {searchResults.length === 0 && !searching && (
          <View style={styles.popularActorsGrid}>
            {popularActors.map(actor => (
              <TouchableOpacity
                key={actor.id}
                style={styles.actorChip}
                onPress={() => {
                  posthog?.capture('actor_selected', { actor_id: actor.id, actor_name: actor.name });
                  navigation.navigate('ActorProfile', { personId: actor.id, personName: actor.name, nameAr: actorNameOverrides[actor.id] || actor.name });
                }}
              >
                {actor.profile_path
                  ? <Image source={{ uri: `${IMAGE_BASE_URL}${actor.profile_path}` }} style={styles.actorPhoto} />
                  : <View style={styles.actorPhotoPlaceholder} />}
                <Text style={styles.actorName} numberOfLines={2}>
                  {language === 'ar' ? (actorNameOverrides[actor.id] || actor.name) : actor.name}{actor.flag ? ` ${actor.flag}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '600', color: '#FFAB76' },
  title: { fontSize: 26, fontWeight: '800', color: '#F5E6D0', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#A08060', marginBottom: 16, fontStyle: 'italic' },
  searchInput: { backgroundColor: '#2A2A2C', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#F5E6D0', fontSize: 14, marginBottom: 8 },
  searchResults: { backgroundColor: '#2A2A2C', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#1C1C1E' },
  searchResultPhoto: { width: 40, height: 40, borderRadius: 20 },
  searchResultPhotoPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3A3A3C' },
  searchResultName: { fontSize: 14, fontWeight: '600', color: '#F5E6D0' },
  searchResultKnown: { fontSize: 12, color: '#6B6B70' },
  popularActorsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  actorChip: { alignItems: 'center', width: '28%' },
  actorPhoto: { width: 82, height: 82, borderRadius: 41, marginBottom: 8 },
  actorPhotoPlaceholder: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#2A2A2C', marginBottom: 8 },
  actorName: { fontSize: 13, color: '#F5E6D0', textAlign: 'center', lineHeight: 18 },
});
