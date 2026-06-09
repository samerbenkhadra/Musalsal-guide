import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Image, FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePostHog } from 'posthog-react-native';
import { IMAGE_BASE_URL, fetchShowById } from '../services/tmdb';
import { fetchTitleOverrides } from '../services/supabase';
import { markWatched } from '../services/watchlist';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const ONBOARDING_SHOW_IDS = [
  90674,  // Ra'fat Al-Haggan
  70926,  // Noor (Gümüş)
  60929,  // Kara Para Aşk
  84299,  // Al Hayba
  88516,  // AlRawabi School for Girls
  278009, // Old Money
  106590, // Paranormal
  110477, // Zezenia
  30695,  // Bab Al-Hara
  67699,  // Tash Ma Tash
  128486, // Rashash
  79567,  // Al Asouf
];

const FEATURES = [
  {
    icon: 'bookmark-outline',
    titleEn: 'Build your watchlist',
    descEn: 'Save shows to watch later, track what you\'ve seen',
    titleAr: 'أنشئ قائمة مشاهدتك',
    descAr: 'احفظ المسلسلات لتشاهدها لاحقاً وتابع ما شاهدته',
  },
  {
    icon: 'star-outline',
    titleEn: 'Rate and review',
    descEn: 'Share your thoughts and see what the community thinks',
    titleAr: 'قيّم وراجع',
    descAr: 'شارك رأيك وشاهد ما يعتقده المجتمع',
  },
  {
    icon: 'compass-outline',
    titleEn: 'Discover new releases, popular shows and classics',
    descEn: 'Arabic and Turkish TV curated for you',
    titleAr: 'اكتشف إصدارات جديدة ومسلسلات شعبية وكلاسيكية',
    descAr: 'مسلسلات عربية وتركية منتقاة لك',
  },
  {
    icon: 'tv-outline',
    titleEn: 'Find where to watch',
    descEn: 'Check which platforms stream the show',
    titleAr: 'اعرف أين تشاهد',
    descAr: 'تحقق من المنصات التي تبث المسلسل',
  },
  {
    icon: 'grid-outline',
    titleEn: 'Explore by region, actor or theme',
    descEn: 'Browse Arabic and Turkish shows your way',
    titleAr: 'استكشف حسب المنطقة أو الممثل أو الموضوع',
    descAr: 'تصفح المسلسلات العربية والتركية بطريقتك',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const { language, toggleLanguage } = useLanguage();
  const posthog = usePostHog();
  const [page, setPage] = useState(0);
  const [shows, setShows] = useState([]);
  const [loadingShows, setLoadingShows] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const ar = language === 'ar';

  const handleSkip = (fromPage) => {
    posthog?.capture('onboarding_skipped', { page: fromPage });
    onComplete();
  };

  useEffect(() => {
    if (page === 2) loadShows();
  }, [page]);

  const loadShows = async () => {
    setLoadingShows(true);
    const apiLang = ar ? 'ar' : 'en';
    const [titleMap, results] = await Promise.all([
      fetchTitleOverrides(),
      Promise.all(ONBOARDING_SHOW_IDS.map(id => fetchShowById(id, apiLang).catch(() => null))),
    ]);
    const loaded = results
      .filter(Boolean)
      .map(s => (!ar && titleMap[s.id]) ? { ...s, name: titleMap[s.id] } : s);
    setShows(loaded);
    setLoadingShows(false);
  };

  const toggleShow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleComplete = async () => {
    for (const id of selectedIds) {
      const show = shows.find(s => s.id === id);
      if (show) await markWatched(id, show);
    }
    if (selectedIds.size > 0) {
      posthog?.capture('onboarding_completed', { shows_selected: selectedIds.size });
    } else {
      posthog?.capture('onboarding_skipped', { page: 2 });
    }
    onComplete();
  };

  const renderDots = () => (
    <View style={styles.dots}>
      {[1, 2, 3].map((num, i) => (
        <View key={i} style={[styles.dot, page === i && styles.dotActive]}>
          <Text style={[styles.dotText, page === i && styles.dotTextActive]}>{num}</Text>
        </View>
      ))}
    </View>
  );

  if (page === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.onboardingTopRow}>
          <View style={styles.langToggle}>
            <TouchableOpacity style={[styles.langBtn, !ar && styles.langBtnActive]} onPress={() => language !== 'en' && toggleLanguage()}>
              <Text style={[styles.langBtnText, !ar && styles.langBtnTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langBtn, ar && styles.langBtnActive]} onPress={() => language !== 'ar' && toggleLanguage()}>
              <Text style={[styles.langBtnText, ar && styles.langBtnTextActive]}>AR</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.skipBtnInRow} onPress={() => handleSkip(0)}>
            <Text style={styles.skipText}>{ar ? 'تخطي' : 'Skip'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Image
            source={require('../assets/Musalsal logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>MusalsalGo</Text>
          <Text style={styles.welcomeTitle}>
            {ar ? 'اكتشف مسلسلات الشرق الأوسط' : 'Discover Middle Eastern TV'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {ar ? 'دليلك للمسلسلات العربية والتركية' : 'Your guide to Arabic and Turkish shows'}
          </Text>
        </View>
        {renderDots()}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setPage(1)}>
          <Text style={styles.primaryBtnText}>{ar ? 'ابدأ' : 'Get Started'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (page === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.skipBtn} onPress={() => handleSkip(1)}>
          <Text style={styles.skipText}>{ar ? 'تخطي' : 'Skip'}</Text>
        </TouchableOpacity>
        <View style={styles.featuresContent}>
          <Text style={styles.featuresTitle}>
            {ar ? 'دليلك لمسلسلات الشرق الأوسط' : 'Your guide to Middle Eastern TV'}
          </Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color="#FFAB76" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{ar ? f.titleAr : f.titleEn}</Text>
                <Text style={styles.featureDesc}>{ar ? f.descAr : f.descEn}</Text>
              </View>
            </View>
          ))}
        </View>
        {renderDots()}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setPage(2)}>
          <Text style={styles.primaryBtnText}>{ar ? 'التالي' : 'Next'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.skipBtn} onPress={() => handleSkip(2)}>
        <Text style={styles.skipText}>{ar ? 'تخطي' : 'Skip'}</Text>
      </TouchableOpacity>
      <View style={styles.page3Header}>
        <Text style={styles.featuresTitle}>
          {ar ? 'هل شاهدت أياً من هذه المسلسلات؟' : 'Have you seen any of these?'}
        </Text>
        <Text style={styles.page3Subtitle}>
          {ar ? 'اضغط على ما شاهدته لبدء قائمة مشاهدتك' : 'Tap the ones you\'ve watched to start building your watchlist'}
        </Text>
      </View>
      {loadingShows ? (
        <ActivityIndicator color="#FFAB76" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={shows}
          keyExtractor={item => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.showGrid}
          columnWrapperStyle={styles.showRow}
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id);
            return (
              <TouchableOpacity style={styles.showCard} onPress={() => toggleShow(item.id)}>
                {item.poster_path ? (
                  <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.showPoster} />
                ) : (
                  <View style={[styles.showPoster, styles.posterPlaceholder]} />
                )}
                {selected && (
                  <View style={styles.selectedOverlay}>
                    <Ionicons name="checkmark-circle" size={32} color="#FFAB76" />
                  </View>
                )}
                <Text style={styles.showName} numberOfLines={2}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
      {renderDots()}
      <TouchableOpacity style={styles.primaryBtn} onPress={handleComplete}>
        <Text style={styles.primaryBtnText}>
          {selectedIds.size > 0
            ? (ar ? `تم — ${selectedIds.size} مسلسل` : `Done — ${selectedIds.size} show${selectedIds.size !== 1 ? 's' : ''}`)
            : (ar ? 'تخطي' : 'Skip for now')}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const CARD_SIZE = Math.floor((width - 16 * 2 - 8 * 2) / 3);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  onboardingTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12 },
  skipBtn: { alignSelf: 'flex-end', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  skipBtnInRow: { paddingBottom: 4 },
  skipText: { fontSize: 13, color: '#6B6B70' },
  langToggle: { flexDirection: 'row', backgroundColor: '#2A2A2C', borderRadius: 8, padding: 3 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#F5E6D0' },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#6B6B70' },
  langBtnTextActive: { color: '#1C1C1E' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  logo: { width: 90, height: 90, marginBottom: 16 },
  appName: { fontSize: 28, fontWeight: '800', color: '#F5E6D0', marginBottom: 6 },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: '#F5E6D0', textAlign: 'center', marginBottom: 10, lineHeight: 32 },
  welcomeSubtitle: { fontSize: 14, color: '#A08060', textAlign: 'center', lineHeight: 21 },
  featuresContent: { flex: 1, paddingHorizontal: 24, paddingTop: 16, justifyContent: 'center' },
  featuresTitle: { fontSize: 22, fontWeight: '800', color: '#F5E6D0', marginBottom: 28, lineHeight: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22, gap: 14 },
  featureIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#2A2A2C', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#F5E6D0', marginBottom: 3 },
  featureDesc: { fontSize: 12, color: '#6B6B70', lineHeight: 17 },
  featureText: { flex: 1 },
  page3Header: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 8 },
  page3Subtitle: { fontSize: 13, color: '#A08060', marginTop: 2 },
  showGrid: { paddingHorizontal: 16, paddingBottom: 8 },
  showRow: { gap: 8, marginBottom: 8 },
  showCard: { width: CARD_SIZE },
  showPoster: { width: CARD_SIZE, height: CARD_SIZE * 1.5, borderRadius: 8 },
  posterPlaceholder: { backgroundColor: '#2A2A2C' },
  selectedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: CARD_SIZE * 0.5 + 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  showName: { fontSize: 10, color: '#F5E6D0', marginTop: 4, lineHeight: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12 },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A2A2C', alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: '#FFAB76' },
  dotText: { fontSize: 13, fontWeight: '700', color: '#6B6B70' },
  dotTextActive: { color: '#1C1C1E' },
  primaryBtn: { alignSelf: 'center', marginBottom: 20, backgroundColor: '#FFAB76', borderRadius: 24, paddingVertical: 13, paddingHorizontal: 48 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
});
