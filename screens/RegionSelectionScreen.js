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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { fetchActorNameOverrides, fetchScoredShowsForChat, callClaude } from '../services/supabase';
import { searchPerson, IMAGE_BASE_URL, fetchShowById, fetchPersonDetails } from '../services/tmdb';
import { getSavedShowsWithMeta, getWatchedShowsWithMeta, toggleSaved } from '../services/watchlist';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { usePostHog } from 'posthog-react-native';

const POPULAR_ACTORS = [
  // Lebanese
  { id: 2047345, name: 'Nadine Njeim', flag: '🇱🇧' },
  { id: 225883, name: 'Carmen Lebbos', flag: '🇱🇧' },
  { id: 231328, name: 'Takla Chamoun', flag: '🇱🇧' },
  { id: 2047355, name: 'Pamela Kik', flag: '🇱🇧' },
  { id: 2804039, name: 'Carmen Bsaibes', flag: '🇱🇧' },
  { id: 3790379, name: 'Nour Ali', flag: '🇱🇧' },
  { id: 230739, name: 'Cyrine Abdel Nour', flag: '🇱🇧' },
  { id: 1326619, name: 'Carol Abboud', flag: '🇱🇧' },
  { id: 108828, name: 'Georges Khabbaz', flag: '🇱🇧' },
  // Egyptian
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
  // Syrian
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
  // Gulf
  { id: 1412399, name: 'Fahad Albutairi', flag: '🇸🇦' },
  // Turkish
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

const COLLECTIONS = [
  {
    id: 'egyptian_classics',
    emoji: '🇪🇬',
    title: 'Egyptian Classics',
    titleAr: 'كلاسيكيات مصرية',
    description: 'A golden era of storytelling that shaped modern Arabic television. Rich in character, emotion, and cultural memory — these are the shows that defined what Arabic drama could be. Simple, powerful narratives that still hold up today.',
    descriptionAr: 'حقبة ذهبية من الحكي شكّلت التلفزيون العربي الحديث. هذه هي المسلسلات التي نشأ عليها كثيرون — غنية بالشخصيات والعاطفة والذاكرة الثقافية.',
    accent: '#C9637A',
    showIds: [52698, 71688, 52560, 62457],
    actorIds: [226423, 226927, 1165335],
  },
  {
    id: 'lebanese_nostalgia',
    emoji: '🇱🇧',
    title: 'Lebanese Nostalgia',
    titleAr: 'نوستالجيا لبنانية',
    description: 'Warm, familiar, and deeply rooted in everyday life. These classics capture a softer, more nostalgic side of Lebanese television, from family moments to lighthearted humour and emotional storytelling.',
    descriptionAr: 'دافئة ومألوفة وعميقة الجذور في تفاصيل الحياة اليومية. تلتقط هذه الكلاسيكيات الجانب الأكثر حنيناً في التلفزيون اللبناني.',
    accent: '#C96363',
    showIds: [319776, 319779, 319895],
    actorIds: [53445],
  },
  {
    id: 'syrian_historical',
    emoji: '🇸🇾',
    title: 'Syrian Historical Dramas',
    titleAr: 'الدراما التاريخية السورية',
    description: 'Epic stories set across different eras of Syrian history. Known for strong production, detailed settings, and serious storytelling that blends politics, identity, and tradition.',
    descriptionAr: 'قصص ملحمية عبر حقب مختلفة من التاريخ السوري. تتميز بإنتاج قوي وإعدادات مفصّلة وحكايات جادة تجمع بين السياسة والهوية والتقاليد.',
    accent: '#637AC9',
    showIds: [157934, 50158, 227582],
    actorIds: [1724956, 1259097, 2862465],
  },
  {
    id: 'gulf_satire',
    emoji: '🌴',
    title: 'Gulf Satire',
    titleAr: 'الكوميديا الساخرة الخليجية',
    description: 'Sharp, witty and culturally rich — Gulf satire uses humour to reflect society, politics, and everyday life across the region. Clever writing with a distinctly Gulf flavour.',
    descriptionAr: 'حادة وذكية وغنية ثقافياً — تستخدم الكوميديا الساخرة الخليجية الفكاهة لتعكس المجتمع والسياسة والحياة اليومية في المنطقة.',
    accent: '#7AC963',
    showIds: [67699, 318188, 132865],
    actorIds: [3272553, 1153105],
  },
  {
    id: 'egyptian_thriller',
    emoji: '🇪🇬',
    title: 'Egyptian Thriller',
    titleAr: 'الإثارة المصرية',
    description: 'Egyptian thrillers dive into a world of corruption, betrayal, and buried secrets, where power and survival collide and no one can be fully trusted.',
    descriptionAr: 'تغوص الإثارة المصرية في عالم من الفساد والخيانة والأسرار المدفونة، حيث تتصادم السلطة والبقاء ولا يمكن الوثوق بأحد.',
    accent: '#E57373',
    showIds: [72048, 106590, 224882],
    actorIds: [1834067, 129488, 140869],
  },
  {
    id: 'turkish_love_stories',
    emoji: '🇹🇷',
    title: 'Turkish Love Stories',
    titleAr: 'قصص الحب التركية',
    description: 'Passion, heartbreak and second chances — Turkish love stories where emotion runs deep and romance never plays it safe.',
    descriptionAr: 'الشغف والحسرة وفرص ثانية — قصص حب تركية تجري فيها المشاعر بعمق والرومانسية لا تلعب على وتر الأمان أبداً.',
    accent: '#FF9A9E',
    showIds: [65555, 80411, 242551, 104877, 105052],
    actorIds: [1424928, 1729378, 1522703],
  },
  {
    id: 'syrian_social',
    emoji: '🇸🇾',
    title: 'Syrian Social Drama',
    titleAr: 'الدراما الاجتماعية السورية',
    description: 'Grounded, realistic storytelling focused on society, class, and human struggle. These shows often reflect deeper social issues while staying emotionally engaging and character-led.',
    descriptionAr: 'حكايات واقعية تركز على المجتمع والطبقة والصراع الإنساني. كثيراً ما تعكس هذه المسلسلات قضايا اجتماعية أعمق مع بقائها مشوّقة ومقودة بالشخصيات.',
    accent: '#89CFF0',
    showIds: [132333, 30695, 122865],
    actorIds: [2594715, 1083478, 2375052],
  },
  {
    id: 'lebanese_comedy',
    emoji: '🇱🇧',
    title: 'Lebanese Lighthearted',
    titleAr: 'البهجة اللبنانية',
    description: 'Easy, feel-good series filled with humour, charm, and everyday situations. Perfect for lighter viewing, these shows balance wit with familiar social dynamics.',
    descriptionAr: 'مسلسلات خفيفة ومرحة مليئة بالفكاهة والسحر والمواقف اليومية. مثالية للمشاهدة الخفيفة، تمزج بين الذكاء والديناميكيات الاجتماعية المألوفة.',
    accent: '#FFD166',
    showIds: [79316, 157058, 130438],
    actorIds: [2331034, 225883, 2047345],
  },
  {
    id: 'turkish_modern',
    emoji: '🇹🇷',
    title: 'Turkish Modern Hits',
    titleAr: 'أبرز الأعمال التركية الحديثة',
    description: 'High-production, emotionally intense dramas that have gained massive regional popularity. These are modern, cinematic series known for strong plots and addictive storytelling.',
    descriptionAr: 'دراما عالية الإنتاج ومكثفة عاطفياً اكتسبت شعبية إقليمية واسعة. مسلسلات حديثة وسينمائية تتميز بحبكات قوية وحكي لا يمكنك مقاومته.',
    accent: '#C97A63',
    showIds: [245914, 240798, 242073, 241020],
    actorIds: [106785, 3615858, 1252061, 1554460],
  },
];

const regions = [
  { name: 'Egyptian', nameAr: 'مصري', emoji: '🇪🇬', color: '#C9637A', cardBg: '#52303C' },
  { name: 'Turkish', nameAr: 'تركي', emoji: '🇹🇷', color: '#C97A63', cardBg: '#523830' },
  { name: 'Gulf', nameAr: 'خليجي', emoji: '🇸🇦🇰🇼', color: '#7AC963', cardBg: '#305238' },
  { name: 'Syrian', nameAr: 'سوري', emoji: '🇸🇾', color: '#637AC9', cardBg: '#303852' },
  { name: 'Lebanese', nameAr: 'لبناني', emoji: '🇱🇧', color: '#C96363', cardBg: '#523030' },
  { name: 'All Arabic', nameAr: 'كل العربي', emoji: '🌍', color: '#B39DDB', cardBg: '#30304A' },
];

const getFeaturedIndex = () => {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return Math.floor(daysSinceEpoch / 2) % COLLECTIONS.length;
};

const getDaysUntilNext = () => {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const currentPeriod = Math.floor(daysSinceEpoch / 2);
  const nextRotationDay = (currentPeriod + 1) * 2;
  return nextRotationDay - daysSinceEpoch;
};

export default function RegionSelectionScreen({ navigation }) {
  const posthog = usePostHog();
  const [mainMode, setMainMode] = useState('discover');
  const [browseMode, setBrowseMode] = useState('actor');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [popularActors, setPopularActors] = useState([]);
  const [actorNameOverrides, setActorNameOverrides] = useState({});
  const [collectionData, setCollectionData] = useState({});
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [savedShows, setSavedShows] = useState([]);
  const [watchedShows, setWatchedShows] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(getFeaturedIndex());
  const { language, toggleLanguage } = useLanguage();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResults, setChatResults] = useState([]);

  const getRecommendations = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    setChatResults([]);
    posthog?.capture('chatbot_query', { type: 'discovery', query: chatInput });
    try {
      const library = await fetchScoredShowsForChat();
      const libraryText = library.map(s => `${s.id}|${s.name}|${s.region}|R:${s.romance},D:${s.drama},Su:${s.suspense},Co:${s.comedy}`).join('\n');
      const prompt = `You are a recommendation assistant for Arabic and Turkish TV shows. The user said: "${chatInput}"\n\nOur show library (id|name|region|scores 0-100):\n${libraryText}\n\nUse the scores to find the best matches but do NOT mention numbers or scores in your reasons. Write natural, human reasons like "shares the same emotional drama" or "features a similar slow-burn romance". Pick 2-3 shows from the library that best match what the user wants. Consider region if mentioned. Exclude shows they said they already watched. Return ONLY JSON: {"recommendations":[{"id":123,"reason":"one sentence why"}]}`;
      const text = await callClaude(prompt);
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      const recs = json.recommendations || [];
      const shows = await Promise.all(recs.map(r => fetchShowById(r.id, language).then(s => s ? { ...s, reason: r.reason } : null)));
      setChatResults(shows.filter(Boolean));
    } catch { setChatResults([]); }
    setChatLoading(false);
  };

  const daysUntilNext = getDaysUntilNext();
  const featuredCollection = COLLECTIONS[selectedIndex];
  const compactCollections = [
    COLLECTIONS[(selectedIndex + 1) % COLLECTIONS.length],
    COLLECTIONS[(selectedIndex + 2) % COLLECTIONS.length],
  ];

  useEffect(() => {
    fetchActorNameOverrides().then(setActorNameOverrides);
    loadPopularActors(language);
    loadCollections(language);
  }, []);

  useFocusEffect(React.useCallback(() => {
    getSavedShowsWithMeta().then(setSavedShows);
    getWatchedShowsWithMeta().then(setWatchedShows);
  }, []));

  useEffect(() => {
    loadPopularActors(language);
    loadCollections(language);
  }, [language]);

  const loadPopularActors = async (lang = 'en') => {
    const results = await Promise.all(
      POPULAR_ACTORS.map(async (a) => {
        const res = await fetch(`https://api.themoviedb.org/3/person/${a.id}?api_key=df249df3a0df066640d620b5d876ef69&language=${lang}`);
        const data = await res.json();
        return data ? { ...data, flag: a.flag } : null;
      })
    );
    setPopularActors(results.filter(Boolean));
  };

  const loadCollections = async (lang = 'en') => {
    const apiLang = lang === 'ar' ? 'ar' : 'en';
    const results = {};
    await Promise.all(
      COLLECTIONS.map(async (col) => {
        const [shows, actors] = await Promise.all([
          Promise.all(col.showIds.map((id) => fetchShowById(id, apiLang).catch(() => null))),
          Promise.all(col.actorIds.map((id) => fetchPersonDetails(id, apiLang).catch(() => null))),
        ]);
        results[col.id] = {
          shows: shows.filter((s) => s && s.poster_path),
          actors: actors.filter(Boolean),
        };
      })
    );
    setCollectionData(results);
    setCollectionsLoaded(true);
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchPerson(text, language);
    setSearchResults(results.slice(0, 6));
    setSearching(false);
  };

  const renderFeatured = (col) => {
    const data = collectionData[col.id];
    return (
      <View style={styles.featuredCard}>
        <View style={[styles.featuredAccentBar, { backgroundColor: col.accent }]} />
        <View style={styles.featuredContent}>
          <Text style={styles.featuredEmoji}>{col.emoji}</Text>
          <Text style={[styles.featuredTitle, { color: col.accent }]}>
            {language === 'ar' ? col.titleAr : col.title}
          </Text>
          <Text style={styles.featuredDescription}>
            {language === 'ar' ? col.descriptionAr : col.description}
          </Text>

          {/* Shows */}
          {!data ? (
            <ActivityIndicator color={col.accent} style={{ marginVertical: 12 }} />
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

          {/* Actors */}
          {data?.actors?.length > 0 && (
            <>
              <Text style={styles.actorsLabel}>
                {language === 'ar' ? 'ممثلون بارزون' : 'Famous actors from these shows'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actorsRow}>
                {data.actors.map((actor) => (
                  <TouchableOpacity
                    key={actor.id}
                    style={styles.actorChipSmall}
                    onPress={() => navigation.navigate('ActorProfile', {
                      personId: actor.id,
                      personName: actor.name,
                      nameAr: language === 'ar' ? actor.name : undefined,
                    })}
                  >
                    {actor.profile_path ? (
                      <Image source={{ uri: `${IMAGE_BASE_URL}${actor.profile_path}` }} style={styles.actorPhotoSmall} />
                    ) : (
                      <View style={styles.actorPhotoSmallPlaceholder} />
                    )}
                    <Text style={styles.actorNameSmall} numberOfLines={2}>{actor.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderCompact = (col) => {
    const data = collectionData[col.id];
    return (
      <TouchableOpacity
        key={col.id}
        style={styles.compactCard}
        onPress={() => setSelectedIndex(COLLECTIONS.findIndex(c => c.id === col.id))}
        activeOpacity={0.8}
      >
        <View style={styles.compactLeft}>
          <Text style={styles.compactEmoji}>{col.emoji}</Text>
          <View>
            <Text style={[styles.compactTitle, { color: col.accent }]}>
              {language === 'ar' ? col.titleAr : col.title}
            </Text>
            <Text style={styles.compactTap}>
              {language === 'ar' ? 'اضغط للاستكشاف' : 'Tap to explore'}
            </Text>
          </View>
        </View>
        {data?.shows?.length > 0 && (
          <View style={styles.compactPosters}>
            {data.shows.slice(0, 3).map((show) => (
              <Image key={show.id} source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.compactPoster} />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MusalsalGo</Text>
            <Text style={styles.subtitle}>
              {language === 'ar' ? 'اكتشف مسلسلات الشرق الأوسط.' : 'Discover Middle Eastern TV.'}
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

        {/* Main Toggle */}
        <View style={styles.mainToggle}>
          <TouchableOpacity
            style={[styles.mainBtn, mainMode === 'discover' && styles.mainBtnActive]}
            onPress={() => setMainMode('discover')}
          >
            <Text style={[styles.mainBtnText, mainMode === 'discover' && styles.mainBtnTextActive]}>
              {language === 'ar' ? '✨ اكتشف' : '✨ Discover'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainBtn, mainMode === 'browse' && styles.mainBtnActive]}
            onPress={() => setMainMode('browse')}
          >
            <Text style={[styles.mainBtnText, mainMode === 'browse' && styles.mainBtnTextActive]}>
              {language === 'ar' ? 'تصفح' : 'Browse'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Discover Tab */}
        {mainMode === 'discover' && (
          <>
            {!collectionsLoaded ? (
              <ActivityIndicator size="large" color="#FFAB76" style={{ marginTop: 40 }} />
            ) : (
              <>
                {watchedShows.length > 0 && (
                  <View style={styles.userSection}>
                    <Text style={styles.userSectionTitle}>{language === 'ar' ? `✓ شاهدت (${watchedShows.length})` : `✓ Watched (${watchedShows.length})`}</Text>
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
                          <Text style={styles.userShowName} numberOfLines={2}>{show.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {savedShows.length > 0 && (
                  <View style={styles.userSection}>
                    <Text style={styles.userSectionTitle}>{language === 'ar' ? `🔖 المحفوظة (${savedShows.length})` : `🔖 Saved (${savedShows.length})`}</Text>
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

                <TouchableOpacity style={styles.chatBtn} onPress={() => setChatOpen(true)}>
                  <Text style={styles.chatBtnText}>{language === 'ar' ? '💬 تحدث لاكتشاف مسلسلات' : '💬 Chat to explore shows'}</Text>
                </TouchableOpacity>

                <View style={styles.collectionLabel}>
                  <Text style={styles.collectionLabelText}>
                    {language === 'ar' ? 'مجموعة اليوم' : "Today's Collection"}
                  </Text>
                  <Text style={styles.countdown}>
                    {language === 'ar'
                      ? `التالية خلال ${daysUntilNext} ${daysUntilNext === 1 ? 'يوم' : 'يومين'} ⏱`
                      : `Next in ${daysUntilNext} ${daysUntilNext === 1 ? 'day' : 'days'} ⏱`}
                  </Text>
                </View>

                {renderFeatured(featuredCollection)}

                <Text style={styles.alsoExploreLabel}>
                  {language === 'ar' ? 'استكشف أيضاً' : 'Also explore'}
                </Text>
                {compactCollections.map(renderCompact)}
              </>
            )}
          </>
        )}

        {/* Browse Tab */}
        {mainMode === 'browse' && (
          <>
            <View style={styles.browseToggle}>
              <TouchableOpacity
                style={[styles.browseBtn, browseMode === 'actor' && styles.browseBtnActive]}
                onPress={() => { setBrowseMode('actor'); posthog?.capture('browse_mode_selected', { mode: 'actor' }); }}
              >
                <Text style={[styles.browseBtnText, browseMode === 'actor' && styles.browseBtnTextActive]}>
                  {language === 'ar' ? 'بالممثل' : 'By Actor'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.browseBtn, browseMode === 'region' && styles.browseBtnActive]}
                onPress={() => { setBrowseMode('region'); posthog?.capture('browse_mode_selected', { mode: 'region' }); }}
              >
                <Text style={[styles.browseBtnText, browseMode === 'region' && styles.browseBtnTextActive]}>
                  {language === 'ar' ? 'بالمنطقة' : 'By Region'}
                </Text>
              </TouchableOpacity>
            </View>

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
                  <View style={styles.popularActorsGrid}>
                    {popularActors.map((actor) => (
                      <TouchableOpacity
                        key={actor.id}
                        style={styles.actorChip}
                        onPress={() => { posthog?.capture('actor_selected', { actor_id: actor.id, actor_name: actor.name }); navigation.navigate('ActorProfile', { personId: actor.id, personName: actor.name, nameAr: actorNameOverrides[actor.id] || actor.name }); }}
                      >
                        {actor.profile_path ? (
                          <Image source={{ uri: `${IMAGE_BASE_URL}${actor.profile_path}` }} style={styles.actorPhoto} />
                        ) : (
                          <View style={styles.actorPhotoPlaceholder} />
                        )}
                        <Text style={styles.actorName} numberOfLines={2}>
                          {language === 'ar' ? (actorNameOverrides[actor.id] || actor.name) : actor.name}{actor.flag ? ` ${actor.flag}` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

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
                      onPress={() => { posthog?.capture('region_selected', { region: region.name }); navigation.navigate('Recommendations', { region: region.name, accent: region.color }); }}
                    >
                      <View style={styles.cardInner}>
                        <Text style={styles.emoji}>{region.emoji}</Text>
                        <Text style={[styles.label, { color: region.color }]}>{language === 'ar' ? region.nameAr : region.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

      </ScrollView>

      <Modal visible={chatOpen} animationType="slide" transparent onRequestClose={() => setChatOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatOverlay}>
          <View style={styles.chatSheet}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>{language === 'ar' ? 'اقتراح مسلسل' : 'Get a Recommendation'}</Text>
              <TouchableOpacity onPress={() => { setChatOpen(false); setChatResults([]); setChatInput(''); }}>
                <Text style={styles.chatClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.chatHint}>
              {language === 'ar' ? 'أخبرنا بمسلسل شاهدته، وسنقترح لك مسلسلات مشابهة قد تعجبك.' : "Tell us a show you watched, we can suggest similar shows you may like."}
            </Text>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder={language === 'ar' ? 'مثال: شاهدت باب الحارة، اقترح لي مسلسلات مشابهة' : 'e.g. I watched Bab Al Hara, suggest similar shows'}
                placeholderTextColor="#6B6B70"
                value={chatInput}
                onChangeText={setChatInput}
                multiline
              />
              <TouchableOpacity style={styles.chatSendBtn} onPress={getRecommendations} disabled={chatLoading}>
                <Text style={styles.chatSendText}>{chatLoading ? '...' : '→'}</Text>
              </TouchableOpacity>
            </View>
            {chatLoading && <ActivityIndicator color="#FFAB76" style={{ marginTop: 20 }} />}
            {chatResults.length > 0 && (
              <ScrollView style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.chatResultsLabel}>{language === 'ar' ? 'قد يعجبك:' : 'You might like:'}</Text>
                {chatResults.map((show) => (
                  <TouchableOpacity
                    key={show.id}
                    style={styles.chatResultCard}
                    onPress={() => { setChatOpen(false); navigation.navigate('EpisodeDetail', { show, accent: '#FFAB76' }); }}
                  >
                    {show.poster_path && <Image source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.chatResultPoster} />}
                    <View style={styles.chatResultInfo}>
                      <Text style={styles.chatResultName}>{show.name}</Text>
                      <Text style={styles.chatResultReason}>{show.reason}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  container: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#F5E6D0', letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#A08060', marginTop: 4, maxWidth: 240 },
  langToggle: { flexDirection: 'row', backgroundColor: '#2A2A2C', borderRadius: 8, padding: 3 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#F5E6D0' },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#6B6B70' },
  langBtnTextActive: { color: '#1C1C1E' },
  mainToggle: { flexDirection: 'row', backgroundColor: '#2A2A2C', borderRadius: 12, padding: 4, marginBottom: 24 },
  mainBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  mainBtnActive: { backgroundColor: '#FFAB76' },
  mainBtnText: { fontSize: 15, fontWeight: '700', color: '#6B6B70' },
  mainBtnTextActive: { color: '#1C1C1E' },
  // Discover
  collectionLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  collectionLabelText: { fontSize: 13, fontWeight: '700', color: '#F5E6D0', textTransform: 'uppercase', letterSpacing: 1 },
  countdown: { fontSize: 12, color: '#6B6B70', fontStyle: 'italic' },
  featuredCard: { backgroundColor: '#2A2A2C', borderRadius: 20, overflow: 'hidden', marginBottom: 20, flexDirection: 'row' },
  featuredAccentBar: { width: 4 },
  featuredContent: { flex: 1, padding: 16 },
  featuredEmoji: { fontSize: 28, marginBottom: 6 },
  featuredTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  featuredDescription: { fontSize: 13, color: '#A08060', lineHeight: 20, marginBottom: 16 },
  userSection: { marginBottom: 24 },
  userSectionTitle: { fontSize: 15, fontWeight: '800', color: '#F5E6D0', marginBottom: 12 },
  userShowsRow: { gap: 10, paddingBottom: 4 },
  userShowItem: { width: 70, position: 'relative' },
  userShowPoster: { width: 70, height: 105, borderRadius: 8 },
  userShowName: { display: 'none' },
  unsaveBtn: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  unsaveBtnText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  ratingBadge: { position: 'absolute', bottom: 22, left: 3, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 5, paddingHorizontal: 3, paddingVertical: 1 },
  ratingBadgeText: { fontSize: 8, color: '#FFD166' },
  showsRow: { gap: 10, marginBottom: 16 },
  showItem: { width: 90 },
  showPoster: { width: 90, height: 135, borderRadius: 10, marginBottom: 5 },
  showName: { fontSize: 10, color: '#C9A880', lineHeight: 14 },
  actorsLabel: { fontSize: 12, color: '#6B6B70', fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  actorsRow: { gap: 14 },
  actorChipSmall: { alignItems: 'center', width: 64 },
  actorPhotoSmall: { width: 52, height: 52, borderRadius: 26, marginBottom: 5 },
  actorPhotoSmallPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1C1C1E', marginBottom: 5 },
  actorNameSmall: { fontSize: 10, color: '#F5E6D0', textAlign: 'center', lineHeight: 14 },
  alsoExploreLabel: { fontSize: 13, fontWeight: '700', color: '#F5E6D0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  compactCard: { backgroundColor: '#2A2A2C', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compactLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  compactEmoji: { fontSize: 22 },
  compactTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  compactTap: { fontSize: 11, color: '#6B6B70' },
  compactPosters: { flexDirection: 'row', gap: 4 },
  compactPoster: { width: 32, height: 48, borderRadius: 5 },
  // Browse
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
  popularActorsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, marginBottom: 8 },
  actorChip: { alignItems: 'center', width: '28%' },
  actorPhoto: { width: 82, height: 82, borderRadius: 41, marginBottom: 8 },
  actorPhotoPlaceholder: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#2A2A2C', marginBottom: 8 },
  actorName: { fontSize: 13, color: '#F5E6D0', textAlign: 'center', lineHeight: 18 },
  regionNote: { fontSize: 13, color: '#A08060', marginBottom: 14, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  card: { width: '47%', aspectRatio: 1.3, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  cardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  emoji: { fontSize: 36, marginBottom: 8, textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },
  chatBtn: { backgroundColor: '#2A2A2C', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: '#3A3A3C' },
  chatBtnText: { color: '#FFAB76', fontSize: 15, fontWeight: '600' },
  chatOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  chatSheet: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '75%', minHeight: '50%' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chatTitle: { fontSize: 18, fontWeight: '700', color: '#F5E6D0' },
  chatClose: { fontSize: 18, color: '#6B6B70' },
  chatHint: { fontSize: 13, color: '#6B6B70', marginBottom: 16 },
  chatInputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  chatInput: { flex: 1, backgroundColor: '#2A2A2C', borderRadius: 12, padding: 12, color: '#F5E6D0', fontSize: 14, maxHeight: 100 },
  chatSendBtn: { backgroundColor: '#FFAB76', borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chatSendText: { color: '#1C1C1E', fontSize: 20, fontWeight: '700' },
  chatResultsLabel: { fontSize: 14, color: '#6B6B70', marginBottom: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chatResultCard: { flexDirection: 'row', gap: 12, marginBottom: 16, backgroundColor: '#2A2A2C', borderRadius: 14, padding: 12 },
  chatResultPoster: { width: 60, height: 90, borderRadius: 8 },
  chatResultInfo: { flex: 1, justifyContent: 'center' },
  chatResultName: { fontSize: 15, fontWeight: '700', color: '#F5E6D0', marginBottom: 6 },
  chatResultReason: { fontSize: 13, color: '#A08060', lineHeight: 18 },
});
