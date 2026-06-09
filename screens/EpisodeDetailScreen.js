import React, { useState, useRef, useEffect, useContext } from 'react';
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
  PanResponder,
  Alert,
} from 'react-native';
import { IMAGE_BASE_URL, fetchWatchProviders, fetchShowById } from '../services/tmdb';
import { getShowScores, TRAITS } from '../services/scoring';
import { fetchWhereToWatch, fetchTitleOverride, callClaude, fetchCommunityRating, fetchComments, postComment, deleteComment, supabase } from '../services/supabase';
import { getWatchedShows, markWatched, toggleWatched, getRating, saveRating, removeRating, getSavedShows, toggleSaved, toggleWatching, getWatchingShows, getShowWatchStatus } from '../services/watchlist';
import { useLanguage } from '../context/LanguageContext';
import { usePostHog } from 'posthog-react-native';
import { ShowLoginContext } from '../App';
import SignUpPromptSheet from '../components/SignUpPromptSheet';

const isArabic = (text) => {
  if (!text) return false;
  const arabic = (text.match(/[؀-ۿ]/g) || []).length;
  return arabic / text.replace(/\s/g, '').length > 0.3;
};

export default function EpisodeDetailScreen({ route, navigation }) {
  const { show: initialShow, accent, isDubbed = false } = route.params;
  const { language } = useLanguage();
  const posthog = usePostHog();
  const showLogin = useContext(ShowLoginContext);
  const t = {
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
  const [isWatching, setIsWatching] = useState(false);
  const [isWantToWatch, setIsWantToWatch] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [sheetReviewInput, setSheetReviewInput] = useState('');
  const [communityRating, setCommunityRating] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [signUpPromptMessage, setSignUpPromptMessage] = useState('');
  const scrollRef = useRef(null);

  const promptSignUp = (message) => {
    setSignUpPromptMessage(message);
    setShowSignUpPrompt(true);
  };

  useEffect(() => {
    posthog?.capture('show_opened', { show_id: initialShow.id, show_name: initialShow.name });
    getShowScores(initialShow).then(setScores);
    if (initialShow.id) {
      fetchWatchProviders(initialShow.id).then(setProviders);
      fetchWhereToWatch(initialShow.id).then(setManualWatchLink);
      getShowWatchStatus(initialShow.id).then(({ isWatched, isWantToWatch, isWatching }) => {
        setIsWatched(isWatched);
        setIsWantToWatch(isWantToWatch);
        setIsWatching(isWatching);
      });
      getRating(initialShow.id).then(setUserRating);
      fetchTitleOverride(initialShow.id).then(title => { if (title) setShow(prev => ({ ...prev, name: title })); });
      fetchCommunityRating(initialShow.id).then(setCommunityRating);
      fetchComments(initialShow.id).then(setComments);
      supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null));
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

          <Text style={styles.showName}>{show.name}</Text>

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
            {scores !== null && (() => {
              const highTraits = TRAITS.filter((trait) => (scores[trait.key] || 0) >= 65);
              const displayTraits = highTraits.length > 0 ? highTraits : TRAITS.filter((trait) => (scores[trait.key] || 0) >= 35);
              return displayTraits.map((trait) => (
                <View key={trait.key} style={[styles.signalBadge, { backgroundColor: trait.color }]}>
                  <Text style={styles.signalBadgeText}>{trait.label}</Text>
                </View>
              ));
            })()}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionRow} contentContainerStyle={styles.actionRowContent}>
            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={() => {
                posthog?.capture('show_shared', { show_id: initialShow.id, show_name: initialShow.name, platform: 'whatsapp' });
                const msg = language === 'ar'
                  ? `شاهد ${show.name} على تطبيق MusalsalGo!`
                  : `Check out ${show.name} on MusalsalGo!`;
                Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
              }}
            >
              <Text style={styles.whatsappBtnText}>📲 {language === 'ar' ? 'شارك' : 'Share'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusBtn, isWatched && { backgroundColor: '#4CAF5020', borderColor: '#4CAF50' }]}
              onPress={() => {
                if (!currentUserId) {
                  if (!isWatched) {
                    setIsWatched(true);
                    setIsWatching(false);
                    setIsWantToWatch(false);
                    markWatched(initialShow.id, initialShow);
                    posthog?.capture('watchlist_action', { action: 'watched', show_id: initialShow.id, show_name: initialShow.name });
                  }
                  return;
                }
                if (isWatched) {
                  setShowRatingModal(true);
                } else {
                  setIsWatched(true);
                  setIsWatching(false);
                  setIsWantToWatch(false);
                  setShowRatingModal(true);
                  markWatched(initialShow.id, initialShow);
                  posthog?.capture('watchlist_action', { action: 'watched', show_id: initialShow.id, show_name: initialShow.name });
                }
              }}
            >
              <Text style={[styles.statusBtnText, isWatched && { color: '#4CAF50' }]}>
                {isWatched ? `✓ ${language === 'ar' ? 'شاهدته' : 'Watched'}` : `✓ ${language === 'ar' ? 'شاهدته' : 'Watched'}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusBtn, isWantToWatch && { backgroundColor: '#637AC920', borderColor: '#637AC9' }]}
              onPress={() => {
                const isNowSaved = !isWantToWatch;
                setIsWantToWatch(isNowSaved);
                if (isNowSaved) {
                  setIsWatched(false);
                  setIsWatching(false);
                  posthog?.capture('watchlist_action', { action: 'want_to_watch', show_id: initialShow.id, show_name: initialShow.name });
                }
                toggleSaved(initialShow.id, initialShow);
              }}
            >
              <Text style={[styles.statusBtnText, isWantToWatch && { color: '#637AC9' }]}>
                🔖 {language === 'ar' ? 'أريد المشاهدة' : 'Watchlist'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusBtn, isWatching && { backgroundColor: '#FFAB7620', borderColor: '#FFAB76' }]}
              onPress={() => {
                const turningOn = !isWatching;
                setIsWatching(turningOn);
                if (turningOn) {
                  setIsWatched(false);
                  setIsWantToWatch(false);
                  posthog?.capture('watchlist_action', { action: 'watching', show_id: initialShow.id, show_name: initialShow.name });
                }
                toggleWatching(initialShow.id, initialShow);
              }}
            >
              <Text style={[styles.statusBtnText, isWatching && { color: '#FFAB76' }]}>
                ▶ {language === 'ar' ? 'أشاهده' : 'Watching'}
              </Text>
            </TouchableOpacity>

          </ScrollView>

          <SignUpPromptSheet
            visible={showSignUpPrompt}
            onClose={() => setShowSignUpPrompt(false)}
            onSignUp={showLogin}
            message={signUpPromptMessage}
            language={language}
          />

          <Modal visible={showRatingModal} transparent animationType="slide" onRequestClose={() => setShowRatingModal(false)}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.sheetOverlay}>
                <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setShowRatingModal(false)} />
                <View style={styles.sheetContainer}>
                  <View style={styles.sheetHandle} />
                  <View style={styles.sheetShowRow}>
                    {(show.poster_path || show.poster_url) && (
                      <Image source={{ uri: show.poster_url || `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.sheetPoster} />
                    )}
                    <Text style={styles.sheetShowName} numberOfLines={2}>{show.name}</Text>
                  </View>
                  <Text style={styles.sheetRatingLabel}>{language === 'ar' ? 'التقييم' : 'Rating'}</Text>
                  <SliderStars
                    rating={userRating || 0}
                    size={60}
                    gap={0}
                    style={{ width: '100%', justifyContent: 'space-between', marginBottom: userRating ? 20 : 8 }}
                    onRate={(val) => {
                      const prev = userRating;
                      setUserRating(val);
                      setCommunityRating(cr => {
                        if (!cr) return { average: val, count: 1 };
                        const total = cr.average * cr.count;
                        const newTotal = prev ? total - prev + val : total + val;
                        const newCount = prev ? cr.count : cr.count + 1;
                        return { average: Math.round((newTotal / newCount) * 10) / 10, count: newCount };
                      });
                      posthog?.capture('show_rated', { show_id: initialShow.id, show_name: initialShow.name, rating: val });
                      saveRating(initialShow.id, val, initialShow).then(() => fetchCommunityRating(initialShow.id).then(setCommunityRating));
                    }}
                  />
                  {!userRating && (
                    <Text style={styles.sheetRateHint}>
                      {language === 'ar' ? 'اضغط أو اسحب للتقييم' : 'Tap or slide to rate'}
                    </Text>
                  )}
                  <View style={styles.sheetDivider} />
                  <Text style={[styles.sheetRatingLabel, { marginTop: 16 }]}>{language === 'ar' ? 'مراجعة' : 'Review'}</Text>
                  <TextInput
                    style={styles.sheetReviewInput}
                    placeholder={language === 'ar' ? 'يستحق المشاهدة؟ أخبر المجتمع...' : 'Worth watching? Tell the community...'}
                    placeholderTextColor="#6B6B70"
                    value={sheetReviewInput}
                    onChangeText={setSheetReviewInput}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                    textAlign={isArabic(sheetReviewInput) ? 'right' : 'left'}
                  />
                  {communityRating && (
                    <Text style={styles.sheetCommunityText}>
                      {language === 'ar'
                        ? `${communityRating.count} من عشاق المسلسلات العربية قيّموا هذا المسلسل`
                        : `${communityRating.count} Musalsal fan${communityRating.count !== 1 ? 's' : ''} rated this`}
                    </Text>
                  )}
                  <TouchableOpacity style={styles.sheetDoneBtn} onPress={async () => {
                    if (sheetReviewInput.trim() && currentUserId) {
                      const { error } = await postComment(initialShow.id, sheetReviewInput.trim(), show);
                      if (error === 'already_reviewed') {
                        Alert.alert(
                          language === 'ar' ? 'مراجعة موجودة' : 'Already reviewed',
                          language === 'ar' ? 'لقد كتبت مراجعة لهذا المسلسل من قبل. احذف مراجعتك الأولى إذا أردت إعادة الكتابة.' : 'You\'ve already reviewed this show. Delete your existing review if you\'d like to rewrite it.',
                        );
                        return;
                      }
                      posthog?.capture('review_submitted', { show_id: initialShow.id, show_name: initialShow.name });
                      setSheetReviewInput('');
                      fetchComments(initialShow.id).then(setComments);
                    }
                    setShowRatingModal(false);
                  }}>
                    <Text style={styles.sheetDoneBtnText}>{language === 'ar' ? 'تم' : 'Done'}</Text>
                  </TouchableOpacity>
                  <View style={styles.sheetActionsRow}>
                    {userRating && (
                      <TouchableOpacity onPress={async () => {
                        const removed = userRating;
                        setUserRating(null);
                        setCommunityRating(cr => {
                          if (!cr || cr.count <= 1) return null;
                          const newCount = cr.count - 1;
                          return { average: Math.round(((cr.average * cr.count - removed) / newCount) * 10) / 10, count: newCount };
                        });
                        await removeRating(initialShow.id);
                        fetchCommunityRating(initialShow.id).then(setCommunityRating);
                      }}>
                        <Text style={styles.removeRatingText}>{language === 'ar' ? 'إزالة التقييم' : 'Remove rating'}</Text>
                      </TouchableOpacity>
                    )}
                    {isWatched && (
                      <TouchableOpacity onPress={() => { setIsWatched(false); setUserRating(null); setShowRatingModal(false); toggleWatched(initialShow.id); removeRating(initialShow.id); }}>
                        <Text style={styles.removeRatingText}>{language === 'ar' ? 'إلغاء المشاهدة' : 'Unmark watched'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          <Section title={t.about} accent={accent}>
            <Text style={styles.bodyText}>
              {show.overview || 'No description available.'}
            </Text>
          </Section>

          <View style={styles.ratingStrip}>
            {communityRating ? (
              <View style={styles.ratingStripCommunity}>
                <Text style={styles.ratingStripAvg}>{communityRating.average}</Text>
                <View style={styles.ratingStripVisualStars}>
                  {[1, 2, 3, 4, 5].map(index => (
                    <HalfStar
                      key={index}
                      index={index}
                      rating={Math.round(communityRating.average * 2) / 2}
                      size={20}
                      filledColor="#FFD166"
                      emptyColor="#3A3A3C"
                    />
                  ))}
                </View>
                <Text style={styles.ratingStripCount}>
                  {language === 'ar'
                    ? `${communityRating.count} من عشاق المسلسلات العربية`
                    : `${communityRating.count} Musalsal fan${communityRating.count !== 1 ? 's' : ''} rated this`}
                </Text>
              </View>
            ) : (
              <View style={styles.ratingStripCommunity}>
                <Text style={styles.ratingStripNoRatings}>
                  {language === 'ar' ? 'كن أول من يقيّم' : 'Be the first to rate'}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.ratingStripUserSide} onPress={() => currentUserId ? setShowRatingModal(true) : promptSignUp(language === 'ar' ? 'أنشئ حساباً لتقييم المسلسلات ومشاركة آرائك مع المجتمع.' : 'Create an account to rate shows and share your opinion with the community.')}>
              {currentUserId ? (
                <>
                  <Text style={styles.ratingStripPrompt}>
                    {userRating ? (language === 'ar' ? 'تقييمك' : 'Your rating') : (language === 'ar' ? 'قيّم وراجع' : 'Rate & Review')}
                  </Text>
                  <View style={styles.ratingStripStars}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <HalfStar key={i} index={i} rating={userRating || 0} size={22} filledColor="#FFD166" emptyColor="#3A3A3C" />
                    ))}
                  </View>
                  <Text style={styles.ratingStripHint}>
                    {userRating ? (language === 'ar' ? 'اضغط للتعديل' : 'Tap to edit') : (language === 'ar' ? 'اضغط للبدء' : 'Tap to start')}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.ratingStripPrompt}>{language === 'ar' ? 'قيّم وراجع' : 'Rate & Review'}</Text>
                  <Text style={[styles.ratingStripHint, { color: '#FFAB76', marginTop: 4 }]}>
                    {language === 'ar' ? 'اضغط للتقييم ←' : 'Tap to rate →'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsTitleRow}>
              <Text style={styles.commentsTitle}>
                {language === 'ar' ? `المراجعات (${comments.length})` : `Reviews (${comments.length})`}
              </Text>
              <TouchableOpacity onPress={() => currentUserId ? setShowRatingModal(true) : promptSignUp(language === 'ar' ? 'أنشئ حساباً لكتابة مراجعات ومشاركتها مع مجتمع المسلسلات.' : 'Create an account to write and share reviews with the Musalsal community.')}>
                <Text style={[styles.seeAll, { color: accent }]}>
                  {language === 'ar' ? '+ اكتب مراجعة' : '+ Write a review'}
                </Text>
              </TouchableOpacity>
            </View>

            {comments.length === 0 ? (
              <Text style={styles.noComments}>
                {language === 'ar' ? 'لا مراجعات بعد. كن أول من يكتب!' : 'No reviews yet. Be the first!'}
              </Text>
            ) : (
              comments.map(c => (
                <View key={c.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{c.display_name || 'user'}</Text>
                    <Text style={styles.commentDate}>
                      {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </Text>
                    {c.user_id === currentUserId && (
                      <TouchableOpacity onPress={async () => {
                        await deleteComment(c.id);
                        fetchComments(initialShow.id).then(setComments);
                      }}>
                        <Text style={styles.commentDelete}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.commentText, isArabic(c.review) && { textAlign: 'right', writingDirection: 'rtl' }]}>{c.review}</Text>
                </View>
              ))
            )}
          </View>

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

          <TouchableOpacity
            style={styles.reportLink}
            onPress={() => Linking.openURL(`mailto:musalsalgo@gmail.com?subject=Musalsalgo Issue Report: ${encodeURIComponent(show?.name || initialShow.name)}&body=Show: ${encodeURIComponent(show?.name || initialShow.name)}%0A%0ADescribe the issue:%0A`)}
          >
            <Text style={styles.reportLinkText}>{language === 'ar' ? 'الإبلاغ عن مشكلة' : 'Report an issue'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HalfStar({ index, rating, size, filledColor, emptyColor, onRate }) {
  const leftVal = index - 0.5;
  const rightVal = index;
  const isFull = rating >= rightVal;
  const isHalf = !isFull && rating >= leftVal;
  return (
    <View style={{ width: size, height: size }}>
      <Text style={{ fontSize: size, lineHeight: size, color: emptyColor, position: 'absolute', top: 0, left: 0, width: size, height: size }}>★</Text>
      {(isFull || isHalf) && (
        <View style={{ width: isFull ? size : size / 2, height: size, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
          <Text style={{ fontSize: size, lineHeight: size, color: filledColor, top: 0, left: 0, width: size, height: size }}>★</Text>
        </View>
      )}
      {onRate && (
        <>
          <TouchableOpacity
            style={{ position: 'absolute', left: 0, width: size / 2, height: size }}
            onPress={() => onRate(leftVal)}
            delayPressIn={0}
            activeOpacity={0.6}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 0, width: size / 2, height: size }}
            onPress={() => onRate(rightVal)}
            delayPressIn={0}
            activeOpacity={0.6}
          />
        </>
      )}
    </View>
  );
}

function SliderStars({ rating, size = 40, gap = 6, filledColor = '#FFD166', emptyColor = '#3A3A3C', onRate, style }) {
  const containerWidthRef = useRef(0);
  const onRateRef = useRef(onRate);
  onRateRef.current = onRate;
  const isDragging = useRef(false);
  const [localRating, setLocalRating] = useState(rating || 0);

  useEffect(() => {
    if (!isDragging.current) setLocalRating(rating || 0);
  }, [rating]);

  const calcRating = (x) => {
    const raw = (Math.max(0, x) / containerWidthRef.current) * 10;
    return Math.max(0.5, Math.min(5, Math.round(raw) / 2));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        setLocalRating(calcRating(evt.nativeEvent.locationX));
      },
      onPanResponderMove: (evt) => {
        setLocalRating(calcRating(evt.nativeEvent.locationX));
      },
      onPanResponderRelease: (evt) => {
        isDragging.current = false;
        const r = calcRating(evt.nativeEvent.locationX);
        setLocalRating(r);
        onRateRef.current?.(r);
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  return (
    <View
      style={[{ flexDirection: 'row', gap }, style]}
      onLayout={(e) => { containerWidthRef.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      {[1, 2, 3, 4, 5].map(index => (
        <HalfStar
          key={index}
          index={index}
          rating={localRating}
          size={size}
          filledColor={filledColor}
          emptyColor={emptyColor}
          onRate={onRate ? (val) => { setLocalRating(val); onRateRef.current?.(val); } : undefined}
        />
      ))}
    </View>
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
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    marginTop: 4,
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
  inlineTraitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    marginTop: 4,
  },
  actionRow: {
    marginBottom: 16,
    flexGrow: 0,
  },
  actionRowContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 24,
  },
  statusBtn: {
    backgroundColor: '#2A2A2C',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F5E6D0',
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
  rateBtn: {
    backgroundColor: '#2A2A2C',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  rateBtnActive: {
    backgroundColor: '#FFD16620',
    borderColor: '#FFD166',
  },
  rateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD166',
  },
  ratingStrip: {
    backgroundColor: '#2A2A2C',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingStripCommunity: {
    flex: 3,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#3A3A3C',
    paddingRight: 16,
  },
  ratingStripAvg: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFD166',
    lineHeight: 46,
  },
  ratingStripVisualStars: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  ratingStripVisualStar: {
    fontSize: 16,
    color: '#3A3A3C',
  },
  ratingStripVisualStarFilled: {
    color: '#FFD166',
  },
  ratingStripCount: {
    fontSize: 11,
    color: '#FFAB76',
    textAlign: 'center',
    lineHeight: 15,
  },
  ratingStripNoRatings: {
    fontSize: 12,
    color: '#6B6B70',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  ratingStripUserSide: {
    flex: 2,
    alignItems: 'center',
  },
  ratingStripPrompt: {
    fontSize: 11,
    color: '#6B6B70',
    marginBottom: 6,
  },
  ratingStripStars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingStripStar: {
    fontSize: 22,
    color: '#3A3A3C',
  },
  ratingStripStarFilled: {
    color: '#FFD166',
  },
  ratingStripHint: {
    fontSize: 10,
    color: '#6B6B70',
    marginTop: 6,
    textAlign: 'center',
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
    marginBottom: 20,
    alignItems: 'center',
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
  communityRating: {
    fontSize: 12,
    color: '#FFAB76',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  ratingNudge: {
    fontSize: 11,
    color: '#6B6B70',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#2A2A2C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 44,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#4A4A4C',
    borderRadius: 2,
    marginBottom: 24,
  },
  sheetShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
    marginBottom: 28,
  },
  sheetPoster: {
    width: 40,
    height: 60,
    borderRadius: 6,
  },
  sheetShowName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5E6D0',
    flex: 1,
  },
  sheetRatingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6B70',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  sheetCommunityText: {
    fontSize: 12,
    color: '#FFAB76',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  sheetRateHint: {
    fontSize: 12,
    color: '#6B6B70',
    marginBottom: 20,
    alignSelf: 'center',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#3A3A3C',
    width: '100%',
  },
  sheetReviewInput: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    color: '#F5E6D0',
    fontSize: 14,
    minHeight: 80,
    maxHeight: 120,
    marginBottom: 16,
    marginTop: 4,
  },
  sheetDoneBtn: {
    backgroundColor: '#FFAB76',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetDoneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  sheetActionsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  commentsSection: { marginTop: 8 },
  commentsTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  commentsTitle: { fontSize: 16, fontWeight: '800', color: '#F5E6D0' },
  commentInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 16 },
  commentInput: { flex: 1, backgroundColor: '#2A2A2C', borderRadius: 12, padding: 12, color: '#F5E6D0', fontSize: 14, maxHeight: 100 },
  commentSendBtn: { backgroundColor: '#FFAB76', borderRadius: 12, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  commentSendText: { color: '#1C1C1E', fontSize: 18, fontWeight: '700' },
  commentLoginHint: { fontSize: 13, color: '#6B6B70', fontStyle: 'italic', marginBottom: 16 },
  noComments: { fontSize: 13, color: '#6B6B70', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  commentCard: { backgroundColor: '#2A2A2C', borderRadius: 12, padding: 12, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#FFAB76', flex: 1 },
  commentDate: { fontSize: 11, color: '#6B6B70' },
  commentDelete: { fontSize: 11, color: '#FF453A', paddingHorizontal: 4 },
  commentText: { fontSize: 14, color: '#F5E6D0', lineHeight: 20 },
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
  reportLink: { alignItems: 'center', paddingVertical: 20 },
  reportLinkText: { fontSize: 12, color: '#3A3A3C' },
});
