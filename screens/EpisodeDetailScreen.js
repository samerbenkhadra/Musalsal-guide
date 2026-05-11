import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { IMAGE_BASE_URL, fetchWatchProviders, fetchShowById } from '../services/tmdb';
import { getShowScores, TRAITS } from '../services/scoring';
import { fetchWhereToWatch, fetchTitleOverride, callClaude } from '../services/supabase';
import { getWatchedShows, markWatched, toggleWatched, getRating, saveRating, removeRating, getSavedShows, toggleSaved } from '../services/watchlist';
import { useLanguage } from '../context/LanguageContext';
import { usePostHog } from 'posthog-react-native';

export default function EpisodeDetailScreen({ route, navigation }) {
  const { show: initialShow, accent, isDubbed = false } = route.params;
  const { language } = useLanguage();
  const posthog = usePostHog();
  const t = {
    vibeCheck: language === 'ar' ? 'تحليل المسلسل' : 'Show Analysis',
    about: language === 'ar' ? 'عن هذا المسلسل' : 'About this show',
    ask: language === 'ar' ? 'اسأل عن هذا المسلسل' : 'Ask about this show',
    whereToWatch: language === 'ar' ? 'أين تشاهده' : 'Where to watch',
    askPlaceholder: language === 'ar' ? 'اسأل سؤالاً...' : 'Ask a question...',
    chatHint: language === 'ar' ? 'اسأل أي شيء — ماذا تريد أن تعرف عن المسلسل؟' : 'Ask anything — what do you want to know about the show?',
  };
  const [show, setShow] = useState(initialShow);
  const year = show.first_air_date ? show.first_air_date.split('-')[0] : '';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState(null);
  const [providers, setProviders] = useState([]);
  const [manualWatchLink, setManualWatchLink] = useState(null);
  const [isWatched, setIsWatched] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    posthog?.capture('show_opened', { show_id: initialShow.id, show_name: initialShow.name });
    getShowScores(initialShow).then(setScores);
    if (initialShow.id) {
      fetchWatchProviders(initialShow.id).then(setProviders);
      fetchWhereToWatch(initialShow.id).then(setManualWatchLink);
      getWatchedShows().then(watched => setIsWatched(watched.has(Number(initialShow.id))));
      getSavedShows().then(saved => setIsSaved(saved.has(Number(initialShow.id))));
      getRating(initialShow.id).then(setUserRating);
      fetchTitleOverride(initialShow.id).then(title => { if (title) setShow(prev => ({ ...prev, name: title })); });
    }
  }, []);

  useEffect(() => {
    if (initialShow.id) {
      fetchShowById(initialShow.id, language === 'ar' ? 'ar' : 'en').then((localized) => {
        if (localized && (localized.name || localized.overview)) {
          setShow({ ...initialShow, ...localized });
        }
      });
    }
  }, [language]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    posthog?.capture('chatbot_query', { type: 'show_detail', show_id: initialShow.id, show_name: initialShow.name, query: text });
    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = `You are a knowledgeable assistant for the Arabic TV show "${show.name}". Here is a description: ${show.overview || 'No description available.'}. Use this description as well as your own knowledge about the show to answer questions. Keep responses short and conversational — 2 to 3 sentences maximum. End each response with one natural follow-up question to keep the conversation going. Write in plain text only — no markdown, no bullet points with *, no # headings, no bold with **. If the user writes in Arabic, respond in Arabic.`;
      const fullPrompt = `${systemPrompt}\n\n${updatedMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}`;
      const reply = (await callClaude(fullPrompt)) || 'Sorry, I could not get a response.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: accent }]}>← Back</Text>
          </TouchableOpacity>

          {(show.poster_url || show.poster_path) ? (
            <Image
              source={{ uri: show.poster_url || `${IMAGE_BASE_URL}${show.poster_path}` }}
              style={styles.poster}
            />
          ) : null}

          <View style={styles.metaRow}>
            {year ? (
              <View style={[styles.badge, { backgroundColor: accent + '30', borderColor: accent }]}>
                <Text style={[styles.badgeText, { color: accent }]}>{year}</Text>
              </View>
            ) : null}
            {isDubbed ? (
              <View style={styles.dubbedBadge}>
                <Text style={styles.dubbedBadgeText}>🎙 {language === 'ar' ? 'مدبلج بالعربية' : 'Dubbed in Arabic'}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.showName}>{show.name}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={() => {
                const msg = language === 'ar'
                  ? `شاهد ${show.name} على تطبيق MusalsalGo!`
                  : `Check out ${show.name} on MusalsalGo!`;
                Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
              }}
            >
              <Text style={styles.whatsappBtnText}>📲 {language === 'ar' ? 'شارك' : 'Share'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.watchedBtn, isWatched && styles.watchedBtnActive]}
              onPress={async () => {
                if (isWatched) {
                  setShowRatingModal(true);
                } else {
                  await markWatched(initialShow.id, initialShow);
                  setIsWatched(true);
                  setShowRatingModal(true);
                }
              }}
            >
              <Text style={styles.watchedBtnText}>
                {isWatched
                  ? (userRating ? `✓ ${'★'.repeat(userRating)}` : `✓ ${language === 'ar' ? 'شاهدته' : 'Watched'}`)
                  : (language === 'ar' ? '+ شاهدته' : '+ Mark Watched')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.savedBtn, isSaved && styles.savedBtnActive]}
              onPress={async () => {
                const updated = await toggleSaved(initialShow.id, initialShow);
                setIsSaved(updated.has(Number(initialShow.id)));
              }}
            >
              <Text style={styles.savedBtnText}>{isSaved ? '🔖 Saved' : '🔖 Save'}</Text>
            </TouchableOpacity>
          </View>

          <Modal visible={showRatingModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{language === 'ar' ? 'كيف كان المسلسل؟' : 'How was it?'}</Text>
                <Text style={styles.modalSubtitle}>{show.name}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                      key={star}
                      onPress={async () => {
                        await saveRating(initialShow.id, star);
                        setUserRating(star);
                        setShowRatingModal(false);
                      }}
                    >
                      <Text style={[styles.star, userRating >= star && styles.starFilled]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                  <Text style={styles.skipText}>{language === 'ar' ? 'تخطى' : 'Skip'}</Text>
                </TouchableOpacity>
                {userRating && (
                  <TouchableOpacity
                    onPress={async () => {
                      await removeRating(initialShow.id);
                      setUserRating(null);
                      setShowRatingModal(false);
                    }}
                    style={{ marginTop: 10 }}
                  >
                    <Text style={styles.removeRatingText}>{language === 'ar' ? 'إزالة التقييم' : 'Remove rating'}</Text>
                  </TouchableOpacity>
                )}
                {isWatched && (
                  <TouchableOpacity
                    onPress={async () => {
                      const updated = await toggleWatched(initialShow.id);
                      setIsWatched(updated.has(Number(initialShow.id)));
                      await removeRating(initialShow.id);
                      setUserRating(null);
                      setShowRatingModal(false);
                    }}
                    style={{ marginTop: 6 }}
                  >
                    <Text style={styles.removeRatingText}>{language === 'ar' ? 'إلغاء المشاهدة' : 'Unmark watched'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>

          <View style={styles.divider} />

          {scores === null ? (
            <Section title={t.vibeCheck} accent={accent}>
              <ActivityIndicator size="small" color={accent} />
            </Section>
          ) : (() => {
            const highTraits = TRAITS.filter((trait) => (scores[trait.key] || 0) >= 65);
            const displayTraits = highTraits.length > 0 ? highTraits : TRAITS.filter((trait) => (scores[trait.key] || 0) >= 35);
            if (displayTraits.length === 0) return null;
            return (
              <Section title={t.vibeCheck} accent={accent}>
                <View style={styles.signalGrid}>
                  {displayTraits.map((trait) => (
                    <View key={trait.key} style={[styles.signalBadge, { backgroundColor: trait.color }]}>
                      <Text style={styles.signalBadgeText}>{trait.label}</Text>
                    </View>
                  ))}
                </View>
              </Section>
            );
          })()}

          <Section title={t.about} accent={accent}>
            <Text style={styles.bodyText}>
              {show.overview || 'No description available.'}
            </Text>
          </Section>

          <Section title={t.ask} accent={accent}>
            <View style={styles.chatMessages}>
              {messages.length === 0 && (
                <Text style={styles.chatPlaceholder}>{t.chatHint}</Text>
              )}
              {messages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                    msg.role === 'user' ? { backgroundColor: accent + '25', borderColor: accent + '60' } : {},
                  ]}
                >
                  <Text style={[styles.bubbleText, msg.role === 'user' ? { color: '#F5E6D0' } : { color: '#C9A880' }]}>
                    {msg.content}
                  </Text>
                </View>
              ))}
              {loading && (
                <View style={styles.aiBubble}>
                  <ActivityIndicator size="small" color={accent} />
                </View>
              )}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder={t.askPlaceholder}
                placeholderTextColor="#6B6B70"
                multiline
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: accent }]}
                onPress={sendMessage}
                disabled={loading}
              >
                <Text style={styles.sendBtnText}>→</Text>
              </TouchableOpacity>
            </View>
          </Section>

          <Section title={t.whereToWatch} accent={accent}>
            {manualWatchLink && manualWatchLink.length > 0 ? (
              <View style={{ gap: 8 }}>
                {manualWatchLink.map((entry, i) => (
                  <TouchableOpacity key={i} onPress={() => { posthog?.capture('where_to_watch_tapped', { platform: entry.platform, show: initialShow.name }); Linking.openURL(entry.url); }}>
                    <Text style={[styles.bodyText, { color: accent }]}>
                      Watch on {entry.platform} →
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : providers.length > 0 ? (
              <View style={styles.providersRow}>
                {providers.map((p, i) => {
                  const name = p.provider_name.toLowerCase();
                  let url;
                  if (name.includes('shahid')) url = `https://shahid.mbc.net/ar/search?q=${encodeURIComponent(show.name)}`;
                  else if (name.includes('netflix')) url = `https://www.netflix.com/search?q=${encodeURIComponent(show.name)}`;
                  else if (name.includes('osn')) url = `https://www.osnplus.com/search/${encodeURIComponent(show.name)}`;
                  else if (name.includes('starz')) url = `https://www.starzplay.com/search?q=${encodeURIComponent(show.name)}`;
                  else if (name.includes('disney')) url = `https://www.disneyplus.com/search/${encodeURIComponent(show.name)}`;
                  else if (name.includes('apple')) url = `https://tv.apple.com/search?term=${encodeURIComponent(show.name)}`;
                  else url = `https://www.google.com/search?q=watch+${encodeURIComponent(show.name)}+on+${encodeURIComponent(p.provider_name)}`;
                  return (
                    <TouchableOpacity key={i} style={styles.providerItem} onPress={() => Linking.openURL(url)}>
                      <Image source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }} style={styles.providerLogo} />
                      <Text style={styles.providerName} numberOfLines={1}>{p.provider_name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  const genre = show.original_language === 'tr' ? 'Turkish TV series streaming' : 'Arabic TV series streaming';
                  Linking.openURL(`https://www.google.com/search?q=watch+${encodeURIComponent(show.name)}+${encodeURIComponent(genre)}`);
                }}
              >
                <Text style={[styles.bodyText, { color: accent }]}>Search online for streaming options →</Text>
              </TouchableOpacity>
            )}
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 16,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dubbedBadge: {
    backgroundColor: '#2A2A2C',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  dubbedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A08060',
  },
  showName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F5E6D0',
    lineHeight: 32,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  whatsappBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  watchedBtn: {
    backgroundColor: '#2A2A2C',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  watchedBtnActive: {
    backgroundColor: '#4CAF5022',
    borderColor: '#4CAF50',
  },
  watchedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5E6D0',
  },
  savedBtn: {
    backgroundColor: '#2A2A2C',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  savedBtnActive: {
    backgroundColor: '#FFAB7622',
    borderColor: '#FFAB76',
  },
  savedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5E6D0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: '#2A2A2C',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: 280,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5E6D0',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#A08060',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  star: {
    fontSize: 36,
    color: '#3A3A3C',
  },
  starFilled: {
    color: '#FFD166',
  },
  skipText: {
    fontSize: 13,
    color: '#6B6B70',
    textDecorationLine: 'underline',
  },
  removeRatingText: {
    fontSize: 12,
    color: '#FF6B6B',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: '#2E2E30',
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
    backgroundColor: '#2A2A2C',
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
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  signalItem: {
    alignItems: 'center',
    gap: 5,
  },
  signalTraitLabel: {
    fontSize: 12,
    color: '#A08060',
    fontWeight: '600',
  },
  signalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  signalBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  traitScore: {
    width: 28,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  providersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerItem: {
    alignItems: 'center',
    width: 60,
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 10,
    color: '#A08060',
    textAlign: 'center',
  },
  chatMessages: {
    marginBottom: 12,
    gap: 8,
  },
  chatPlaceholder: {
    fontSize: 13,
    color: '#6B6B70',
    fontStyle: 'italic',
    lineHeight: 19,
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  aiBubble: {
    alignSelf: 'stretch',
    backgroundColor: '#1C1C1E',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F5E6D0',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
});
