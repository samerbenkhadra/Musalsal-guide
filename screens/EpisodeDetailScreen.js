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
} from 'react-native';
import { IMAGE_BASE_URL, fetchWatchProviders } from '../services/tmdb';
import { CLAUDE_API_KEY } from '../services/config';
import { getShowScores, TRAITS } from '../services/scoring';

export default function EpisodeDetailScreen({ route, navigation }) {
  const { show, accent } = route.params;
  const year = show.first_air_date ? show.first_air_date.split('-')[0] : '';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState(null);
  const [providers, setProviders] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    getShowScores(show).then(setScores);
    if (show.id) fetchWatchProviders(show.id).then(setProviders);
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: `You are a knowledgeable assistant for the Arabic TV show "${show.name}". Here is a description: ${show.overview || 'No description available.'}. Use this description as well as your own knowledge about the show to answer questions. Keep responses short and conversational — 2 to 3 sentences maximum. End each response with one natural follow-up question to keep the conversation going. Write in plain text only — no markdown, no bullet points with *, no # headings, no bold with **. If the user writes in Arabic, respond in Arabic.`,
          messages: updatedMessages,
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Sorry, I could not get a response.';
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
          </View>

          <Text style={styles.showName}>{show.name}</Text>

          <View style={styles.divider} />

          {scores ? (
            <Section title="Vibe Check" accent={accent}>
              {TRAITS.map((trait) => (
                <View key={trait.key} style={styles.traitRow}>
                  <Text style={styles.traitLabel}>{trait.label}</Text>
                  <View style={styles.traitBarBg}>
                    <View style={[styles.traitBarFill, { width: `${scores[trait.key] || 0}%`, backgroundColor: trait.color }]} />
                  </View>
                  <Text style={[styles.traitScore, { color: trait.color }]}>{scores[trait.key] || 0}</Text>
                </View>
              ))}
            </Section>
          ) : (
            <Section title="Vibe Check" accent={accent}>
              <ActivityIndicator size="small" color={accent} />
            </Section>
          )}

          <Section title="About this show" accent={accent}>
            <Text style={styles.bodyText}>
              {show.overview || 'No description available.'}
            </Text>
          </Section>

          <Section title="Ask about this show" accent={accent}>
            <View style={styles.chatMessages}>
              {messages.length === 0 && (
                <Text style={styles.chatPlaceholder}>Ask anything — what do you want to know about the show?</Text>
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
                placeholder="Ask a question..."
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

          <Section title="Where to watch" accent={accent}>
            {providers.length > 0 ? (
              <View style={styles.providersRow}>
                {providers.map((p, i) => {
                  const name = p.provider_name.toLowerCase();
                  let url;
                  if (name.includes('shahid')) url = `https://shahid.mbc.net/ar/search?q=${encodeURIComponent(show.name)}`;
                  else if (name.includes('netflix')) url = `https://www.netflix.com/search?q=${encodeURIComponent(show.name)}`;
                  else if (name.includes('osn')) url = `https://www.osnplus.com/search/${encodeURIComponent(show.name)}`;
                  else if (name.includes('starz')) url = `https://www.starzplay.com/search?q=${encodeURIComponent(show.name)}`;
                  else if (name.includes('disney')) url = `https://www.disneyplus.com/search/${encodeURIComponent(show.name)}`;
                  else url = `https://www.google.com/search?q=watch+${encodeURIComponent(show.name)}+on+${encodeURIComponent(p.provider_name)}`;

                  return (
                  <TouchableOpacity key={i} style={styles.providerItem} onPress={() => Linking.openURL(url)}>
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }}
                      style={styles.providerLogo}
                    />
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
  showName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F5E6D0',
    lineHeight: 32,
    marginBottom: 8,
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
  traitLabel: {
    width: 72,
    fontSize: 13,
    color: '#F5E6D0',
    fontWeight: '600',
  },
  traitBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  traitBarFill: {
    height: '100%',
    borderRadius: 4,
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
