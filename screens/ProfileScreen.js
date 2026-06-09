import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, Image, ActivityIndicator, ScrollView, TextInput, Dimensions, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getWatchedShowsWithMeta, getSavedShowsWithMeta, getWatchingShowsWithMeta, getRatedShowsWithMeta } from '../services/watchlist';
import { IMAGE_BASE_URL, fetchShowById } from '../services/tmdb';
import { getProfile, updateDisplayName, setActivityPreference } from '../services/supabase';
import { ShowLoginContext } from '../App';
import { invalidateActivityCache } from './ActivityScreen';
import Skeleton from '../components/Skeleton';

const SKEL_PADDING = 16;
const SKEL_GAP = 8;
const SKEL_CARD = Math.floor((Dimensions.get('window').width - SKEL_PADDING * 2 - SKEL_GAP * 2) / 3);

function ProfileGridSkeleton() {
  return (
    <View style={{ paddingHorizontal: SKEL_PADDING, paddingTop: 4 }}>
      {[0, 1, 2, 3].map(row => (
        <View key={row} style={{ flexDirection: 'row', gap: SKEL_GAP, marginBottom: SKEL_GAP }}>
          {[0, 1, 2].map(col => (
            <Skeleton key={col} width={SKEL_CARD} height={SKEL_CARD * 1.5} borderRadius={8} />
          ))}
        </View>
      ))}
    </View>
  );
}

const TABS = [
  { key: 'watched', label: 'Watched', labelAr: 'شاهدته', icon: '✓' },
  { key: 'watching', label: 'Watching', labelAr: 'أشاهده', icon: '▶' },
  { key: 'want_to_watch', label: 'Watchlist', labelAr: 'قائمتي', icon: '🔖' },
  { key: 'ratings', label: 'Ratings', labelAr: 'تقييماتي', icon: '★' },
];

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const showLogin = React.useContext(ShowLoginContext);
  const [activeTab, setActiveTab] = useState('watched');
  const [tabData, setTabData] = useState({ watched: [], watching: [], want_to_watch: [], ratings: [] });
  const [loading, setLoading] = useState(false);
  const [showInActivity, setShowInActivity] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const watched = await getWatchedShowsWithMeta();
    setTabData(prev => ({ ...prev, watched }));
    setLoading(false);
    const [watching, want_to_watch, ratings] = await Promise.all([
      getWatchingShowsWithMeta(),
      getSavedShowsWithMeta(),
      getRatedShowsWithMeta(),
    ]);
    let newData = { watched, watching, want_to_watch, ratings };
    if (language === 'ar') {
      const allShows = [...watched, ...watching, ...want_to_watch, ...ratings];
      const uniqueIds = [...new Set(allShows.map(s => s.id).filter(Boolean))];
      const arNames = {};
      await Promise.all(uniqueIds.map(id =>
        fetchShowById(id, 'ar').then(s => { if (s?.name) arNames[id] = s.name; }).catch(() => {})
      ));
      const enrich = arr => arr.map(s => arNames[s.id] ? { ...s, name: arNames[s.id] } : s);
      newData = { watched: enrich(watched), watching: enrich(watching), want_to_watch: enrich(want_to_watch), ratings: enrich(ratings) };
    }
    setTabData(newData);
  };

  useEffect(() => {
    getProfile().then(profile => {
      if (profile) {
        setShowInActivity(profile.show_in_activity || false);
        setDisplayName(profile.display_name || '');
      }
    });
  }, []);

  useFocusEffect(useCallback(() => {
    loadAll();
  }, []));

  useEffect(() => { loadAll(); }, [language]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{displayName || 'Profile'}</Text>
          <Text style={styles.subtitle}>{language === 'ar' ? 'تابع المسلسلات وقيّمها' : 'Your shows and ratings'}</Text>
        </View>
        <View style={styles.headerRight}>
          {user && (
            <TouchableOpacity onPress={() => setSettingsOpen(o => !o)} style={styles.gearBtn}>
              <Ionicons name={settingsOpen ? 'settings' : 'settings-outline'} size={22} color={settingsOpen ? '#FFAB76' : '#6B6B70'} />
            </TouchableOpacity>
          )}
          <View style={styles.langToggle}>
            <TouchableOpacity style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => language !== 'en' && toggleLanguage()}>
              <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langBtn, language === 'ar' && styles.langBtnActive]} onPress={() => language !== 'ar' && toggleLanguage()}>
              <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>AR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {!user && (
        <TouchableOpacity style={styles.guestBanner} onPress={showLogin}>
          <View style={styles.guestBannerText}>
            <Text style={styles.guestBannerTitle}>{language === 'ar' ? 'سجّل للحفاظ على قائمتك' : 'Sign up to sync your watchlist'}</Text>
            <Text style={styles.guestBannerSubtitle}>{language === 'ar' ? 'قائمتك محفوظة محلياً. سجّل للوصول إليها من أي جهاز.' : 'Your watchlist is saved locally. Sign up to keep it safe across devices.'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFAB76" />
        </TouchableOpacity>
      )}

      {user && settingsOpen && (
        <View style={styles.settingsPanel}>
          <View style={styles.displayNameRow}>
            <TextInput
              style={styles.displayNameInput}
              value={displayName}
              onChangeText={val => { setDisplayName(val); setDisplayNameSaved(false); }}
              placeholder={language === 'ar' ? 'أدخل اسمك' : 'Enter display name'}
              placeholderTextColor="#6B6B70"
              maxLength={30}
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.displayNameSaveBtn, displayNameSaved && styles.displayNameSaveBtnDone]}
              onPress={async () => {
                if (!displayName.trim()) return;
                await updateDisplayName(displayName);
                invalidateActivityCache();
                setDisplayNameSaved(true);
              }}
            >
              <Text style={styles.displayNameSaveBtnText}>{displayNameSaved ? '✓' : (language === 'ar' ? 'حفظ' : 'Save')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{language === 'ar' ? 'اظهر اسمك في النشاط' : 'Show name in Activity feed'}</Text>
            <View style={styles.yesNoRow}>
              <TouchableOpacity
                style={[styles.yesNoBtn, showInActivity && styles.yesNoBtnActive]}
                onPress={async () => { setShowInActivity(true); await setActivityPreference(true); }}
              >
                <Text style={[styles.yesNoBtnText, showInActivity && styles.yesNoBtnTextActive]}>{language === 'ar' ? 'نعم' : 'Yes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.yesNoBtn, !showInActivity && styles.yesNoBtnActive]}
                onPress={async () => { setShowInActivity(false); await setActivityPreference(false); }}
              >
                <Text style={[styles.yesNoBtnText, !showInActivity && styles.yesNoBtnTextActive]}>{language === 'ar' ? 'لا' : 'No'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => Linking.openURL('mailto:musalsalgo@gmail.com?subject=Musalsalgo Feedback')}
          >
            <Ionicons name="mail-outline" size={15} color="#FFAB76" />
            <Text style={styles.feedbackBtnText}>{language === 'ar' ? 'أرسل ملاحظاتك' : 'Send Feedback'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => Linking.openURL('mailto:musalsalgo@gmail.com?subject=Show Request')}
          >
            <Ionicons name="add-circle-outline" size={15} color="#FFAB76" />
            <Text style={styles.feedbackBtnText}>{language === 'ar' ? 'لم تجد مسلسلاً في البحث؟ أخبرنا' : 'Can\'t find a show on the home page search? Let us know'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <>
              <TouchableOpacity
                style={styles.feedbackBtn}
                onPress={async () => {
                  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                  await AsyncStorage.removeItem('onboarding_complete_v1');
                  Alert.alert('Dev', 'Onboarding reset — restart the app');
                }}
              >
                <Ionicons name="refresh-outline" size={15} color="#6B6B70" />
                <Text style={[styles.feedbackBtnText, { color: '#6B6B70' }]}>Reset Onboarding (Dev)</Text>
              </TouchableOpacity>

            </>
          )}
          <TouchableOpacity style={styles.closeSettingsBtn} onPress={() => setSettingsOpen(false)}>
            <Text style={styles.closeSettingsText}>{language === 'ar' ? '✕ إغلاق' : '✕ Close'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]} numberOfLines={1}>
              {tab.icon} {language === 'ar' ? tab.labelAr : tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ProfileGridSkeleton />
      ) : (
        <FlatList
          data={tabData[activeTab]}
          keyExtractor={item => item.id.toString()}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.showCard}
              onPress={() => navigation.navigate('EpisodeDetail', { show: item, accent: '#FFAB76' })}
            >
              {item.poster_path ? (
                <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.poster} />
              ) : (
                <View style={styles.posterPlaceholder} />
              )}
              {item.rating && (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>{'★'.repeat(item.rating)}</Text>
                </View>
              )}
              <Text style={styles.showName} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {language === 'ar'
                  ? (activeTab === 'watched' ? 'لا مسلسلات مشاهَدة بعد' :
                     activeTab === 'watching' ? 'لا مسلسلات قيد المشاهدة' :
                     activeTab === 'want_to_watch' ? 'قائمتك فارغة' :
                     'لا تقييمات بعد')
                  : (activeTab === 'watched' ? 'No watched shows yet' :
                     activeTab === 'watching' ? 'No shows in progress' :
                     activeTab === 'want_to_watch' ? 'No saved shows yet' :
                     'No ratings yet')}
              </Text>
              <Text style={styles.emptySubtext}>
                {language === 'ar'
                  ? (activeTab === 'watched' ? 'ابدأ بإضافة المسلسلات التي شاهدتها' :
                     activeTab === 'watching' ? 'أضف المسلسلات التي تشاهدها الآن' :
                     activeTab === 'want_to_watch' ? 'احفظ المسلسلات التي تريد مشاهدتها' :
                     'قيّم المسلسلات لتظهر هنا')
                  : (activeTab === 'watched' ? 'Start building your profile by adding watched shows here' :
                     activeTab === 'watching' ? 'Start building your profile by adding shows you are currently watching here' :
                     activeTab === 'want_to_watch' ? 'Start building your profile by saving shows you want to watch here' :
                     'Start building your profile by rating shows')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const PADDING = 16;
const GAP = 8;
const CARD_SIZE = Math.floor((Dimensions.get('window').width - PADDING * 2 - GAP * 2) / 3);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gearBtn: { padding: 4 },
  langToggle: { flexDirection: 'row', backgroundColor: '#2A2A2C', borderRadius: 8, padding: 3 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#F5E6D0' },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#6B6B70' },
  langBtnTextActive: { color: '#1C1C1E' },
  title: { fontSize: 28, fontWeight: '800', color: '#F5E6D0', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#A08060', marginTop: 2 },
  email: { fontSize: 13, color: '#6B6B70', marginTop: 2 },
  settingsPanel: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2A2A2C',
    paddingTop: 12,
    paddingBottom: 4,
    marginBottom: 8,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  displayNameInput: {
    flex: 1,
    backgroundColor: '#2A2A2C',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F5E6D0',
    fontSize: 13,
  },
  displayNameSaveBtn: {
    backgroundColor: '#FFAB76',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  displayNameSaveBtnDone: { backgroundColor: '#4CAF50' },
  displayNameSaveBtnText: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  toggleLabel: { fontSize: 13, color: '#A08060', flex: 1, marginLeft: 4 },
  yesNoRow: { flexDirection: 'row', gap: 6 },
  yesNoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2A2A2C',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  yesNoBtnActive: { backgroundColor: '#FFAB7620', borderColor: '#FFAB76' },
  yesNoBtnText: { fontSize: 12, fontWeight: '600', color: '#6B6B70' },
  yesNoBtnTextActive: { color: '#FFAB76' },
  guestBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2C', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, gap: 12 },
  guestBannerText: { flex: 1 },
  guestBannerTitle: { fontSize: 14, fontWeight: '700', color: '#F5E6D0', marginBottom: 4 },
  guestBannerSubtitle: { fontSize: 12, color: '#6B6B70', lineHeight: 17 },
  feedbackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12 },
  feedbackBtnText: { color: '#FFAB76', fontSize: 13, fontWeight: '600' },
  signOutBtn: { paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { color: '#6B6B70', fontSize: 13 },
  closeSettingsBtn: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#2A2A2C', marginTop: 4 },
  closeSettingsText: { color: '#6B6B70', fontSize: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 20, backgroundColor: '#2A2A2C', alignItems: 'center' },
  tabActive: { backgroundColor: '#FFAB76' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#6B6B70' },
  tabTextActive: { color: '#1C1C1E' },
  grid: { paddingHorizontal: 16, paddingBottom: 20 },
  row: { gap: 8, marginBottom: 8 },
  showCard: { width: CARD_SIZE },
  poster: { width: CARD_SIZE, height: CARD_SIZE * 1.5, borderRadius: 8 },
  posterPlaceholder: { width: CARD_SIZE, height: CARD_SIZE * 1.5, borderRadius: 8, backgroundColor: '#2A2A2C' },
  ratingBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2 },
  ratingBadgeText: { fontSize: 9, color: '#FFD166' },
  showName: { fontSize: 10, color: '#F5E6D0', marginTop: 4, lineHeight: 13 },
  empty: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#F5E6D0', textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: '#6B6B70', textAlign: 'center' },
});
