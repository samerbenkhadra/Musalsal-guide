import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

const eras = [
  { name: 'Classic', emoji: '📼', description: 'Before 2010', color: '#FFAB76', cardBg: '#4A3020' },
  { name: 'Modern', emoji: '📺', description: '2010 – 2019', color: '#B39DDB', cardBg: '#302848' },
  { name: 'Recent', emoji: '🔥', description: '2020 onwards', color: '#E8A0BF', cardBg: '#48202E' },
  { name: 'Ramadan', emoji: '🌙', description: 'Ramadan specials', color: '#7AC9C9', cardBg: '#203848' },
];

const regionFacts = {
  Egyptian: [
    'Egypt has been producing TV dramas since the 1960s, making it one of the oldest TV industries in the Arab world.',
    'Egyptian Arabic is understood across the entire Arab world, making Egyptian shows the most widely watched in the region.',
    'The month of Ramadan accounts for more than 50% of Egyptian TV drama production each year.',
    'Egyptian TV series are often 30 episodes long — one episode per night during Ramadan.',
    'Cairo has over 30 private TV channels dedicated to drama and entertainment.',
    'Egyptian productions dominated Arab TV for decades before Turkish and Gulf shows rose to prominence.',
    'The Egyptian show "Layali El Helmia" ran for over 40 years and is considered one of the greatest Arab dramas ever made.',
    'Many of the biggest Arab stars — including Adel Imam — built their careers in Egyptian TV.',
    'Egypt introduced the concept of the "mosalsal" format — serialised drama episodes — to the Arab world.',
    'Egyptian studios in Cairo\'s Madinat El Intaj El Ilami are the largest TV production facilities in the Middle East.',
    'The Egyptian TV industry employs over 100,000 people directly and indirectly.',
    'Egyptian drama writers are among the most prolific in the Arab world, with some writing 5+ series per year.',
    'Egypt was the first Arab country to broadcast in colour TV, starting in 1976.',
    'Historical epics are a beloved genre in Egypt — shows set in Pharaonic or Islamic eras attract huge audiences.',
    'Egyptian shows are often dubbed into different Arabic dialects for broadcast in other countries.',
    'The rise of streaming platforms like Shahid and Netflix has pushed Egyptian productions to higher budgets.',
    'Egyptian comedian Adel Imam\'s TV specials regularly break viewership records across the Arab world.',
    'Many Egyptian Ramadan series are now shot months in advance to meet increasing production quality demands.',
    'Egypt exports its TV content to over 22 Arab countries every year.',
    'Egyptian soap operas inspired the format of many Gulf and Levantine drama productions in the 80s and 90s.',
  ],
  Turkish: [
    'Turkish TV dramas, known as "dizi", are the second most exported TV content in the world after American series.',
    'Turkey exports its shows to over 150 countries, generating more than $500 million in annual export revenue.',
    'The show "Noor" (Gümüş) was the first Turkish drama to air dubbed in Arabic, sparking a revolution in Arab TV tastes.',
    'Turkish episodes are notoriously long — some run up to 2.5 hours each, longer than a Hollywood film.',
    'The Turkish drama industry employs over 200,000 people and is a cornerstone of the country\'s economy.',
    'Istanbul has become one of the world\'s busiest TV production hubs, with dozens of sets operating simultaneously.',
    'Turkish shows introduced the concept of high-budget outdoor cinematography to Arab TV audiences.',
    'Diriliş: Ertuğrul became one of the most watched shows in the Arab world during the COVID-19 lockdowns.',
    'The Arabic-dubbed version of Turkish shows often outsells the original Turkish broadcast.',
    'Turkish TV productions typically have budgets 3–5 times higher than equivalent Arab productions.',
    'Some Turkish actors became household names in Arab countries before they were famous in Turkey itself.',
    'The Turkish government actively subsidises TV exports as part of its cultural diplomacy strategy.',
    'Historical Turkish dramas sparked widespread interest in Ottoman history across the Arab world.',
    'Turkish shows are known for their fashion — clothing worn by characters routinely sells out across the Arab world after airing.',
    'The show "Kurtlar Vadisi" (Valley of the Wolves) was one of the first Turkish series to tackle political themes openly.',
    'Turkish romantic dramas significantly shifted Arab audience expectations for on-screen chemistry and storytelling.',
    'Many Arab production companies have partnered with Turkish studios to create Arabic-Turkish co-productions.',
    'Turkey\'s Kanal D was one of the first channels to invest heavily in high-production drama series in the 2000s.',
    'The popularity of Turkish shows in the Arab world led Saudi Arabia to briefly ban them in the 2000s.',
    'Turkish actors like Kıvanç Tatlıtuğ and Burak Özçivit have massive dedicated fanbases across the Arab world.',
  ],
  Gulf: [
    'Gulf TV production has grown by over 300% since 2010, driven by oil wealth and a desire for local storytelling.',
    'Saudi Arabia\'s Vision 2030 includes a major push to develop a local entertainment and TV production industry.',
    'The UAE is home to twofour54, one of the largest media production hubs in the Arab world.',
    'Gulf Ramadan dramas have become increasingly competitive with Egyptian productions in recent years.',
    'MBC Group, based in Dubai, is the most watched TV network in the Arab world.',
    'Shahid, the Gulf-based streaming platform, has invested heavily in original Gulf drama productions since 2020.',
    'Gulf productions are known for their extremely high production budgets compared to other Arab TV industries.',
    'Kuwaiti TV drama has a long tradition dating back to the 1960s and was influential in early Gulf storytelling.',
    'Saudi comedies like "Selfie" broke records on YouTube and helped launch a new generation of Gulf creators.',
    'The Gulf dialect used in drama series has become increasingly familiar to Arab audiences across the region.',
    'Gulf productions have attracted major Egyptian and Syrian actors as the industry has grown in prestige.',
    'Dubai Media City is home to over 100 international and regional media companies.',
    'Qatar\'s beIN Media Group has invested significantly in original Arabic drama content since 2014.',
    'The Gulf region has the highest per-capita spending on TV content production in the Arab world.',
    'Gulf historical dramas depicting Bedouin and tribal life have found audiences across the entire Arab world.',
    'Saudi Arabia lifted its ban on cinemas in 2018, which also accelerated investment in local TV drama.',
    'Gulf productions increasingly feature pan-Arab casts to maximise viewership across different countries.',
    'The Murex d\'Or awards, often called the Arab Oscars, frequently recognise Gulf productions.',
    'Kuwait produced some of the first Gulf TV series in the Arab world back in the 1960s.',
    'Abu Dhabi Media has become a major financier of high-budget Arabic drama series in recent years.',
  ],
  Syrian: [
    'Syria was considered the creative capital of Arab TV drama from the 1990s until the early 2010s.',
    'Syrian drama introduced a more realistic and gritty style of storytelling that contrasted with Egyptian melodrama.',
    'Damascus was known as the "Hollywood of the Arab world" for TV production before the 2011 conflict.',
    'Syrian actors and directors are considered among the most technically trained in the Arab world.',
    'Bab Al Hara, a Syrian period drama, became one of the most watched Arab shows of the 2000s with 8 seasons.',
    'Syrian productions often tackled social and political themes that other Arab TV industries avoided.',
    'The Syrian drama industry was famous for producing shows that resonated with all Arab audiences, not just local ones.',
    'Many top Syrian directors and writers relocated to other Arab countries after 2011 but continued producing acclaimed work.',
    'Syrian Ramadan dramas were the most anticipated releases across the Arab world throughout the 2000s.',
    'The Syrian dialect is considered one of the most widely understood Arabic dialects after Egyptian Arabic.',
    'Syrian historical dramas often drew on rich Levantine history, including Ottoman, Byzantine and Umayyad eras.',
    'Syrian TV writers are known for long, detailed scripts — some series have scripts exceeding 1,000 pages.',
    'The show "Al Intizar" (The Wait) is considered a landmark of Syrian social realism in TV drama.',
    'Syrian actors like Tim Hassan and Maxim Khalil have become pan-Arab stars through their TV work.',
    'Syrian drama production largely moved to Egypt, Jordan and the UAE after the 2011 conflict disrupted the industry.',
    'The Syrian TV industry was one of the first in the Arab world to produce long-running soap operas.',
    'Syrian directors pioneered the use of location shooting in historical settings, raising production standards region-wide.',
    'Co-productions between Syrian and Gulf production companies became common in the 2010s.',
    'Syrian drama is credited with popularising the anthology format in Arab TV — different stories, same production team.',
    'Despite displacement, Syrian creatives continued producing award-winning content throughout the 2010s from abroad.',
  ],
  Lebanese: [
    'Lebanon has one of the most competitive and diverse TV markets in the Arab world relative to its small population.',
    'Lebanese TV channels like LBC and MTV were pioneers in introducing reality TV and talk shows to Arab audiences.',
    'Beirut has long been considered the media and advertising capital of the Arab world.',
    'Lebanese productions are known for their high production values and cinematic visual style.',
    'LBC (Lebanese Broadcasting Corporation) was the first private TV channel in the Arab world, launching in 1985.',
    'Lebanese drama often blends social commentary with entertainment in ways that resonate across the Arab world.',
    'The Lebanese TV industry has produced some of the Arab world\'s most prominent female directors and producers.',
    'Lebanese shows were among the first in the Arab world to tackle taboo subjects like mental health and addiction.',
    'Despite economic crises, Lebanon continues to produce internationally recognised drama content.',
    'The Lebanese dialect in TV is often seen as aspirational and modern by younger Arab audiences.',
    'Lebanese productions have a strong tradition of adapting international formats for Arab audiences.',
    'Beirut\'s vibrant arts scene has produced many crossover talents who work in both film and TV.',
    'Lebanese TV introduced the Arab world to the talk show format with programmes that influenced the entire region.',
    'Some Lebanese productions have been screened at international film festivals, blurring the line between TV and cinema.',
    'Lebanese actors are known for switching between Arabic dialects fluently, making them versatile in pan-Arab productions.',
    'The show "Hayda Haki" pioneered the political satire format on Arab TV.',
    'Lebanon\'s TV industry has survived civil war, economic collapse and regional instability — a testament to its resilience.',
    'Lebanese music TV channels like Rotana and MTV Lebanon helped define the visual style of Arab pop culture.',
    'Many pan-Arab talent competitions were originally conceived and produced by Lebanese TV companies.',
    'Lebanese drama writers are known for their sharp dialogue — often considered the wittiest in Arab TV.',
  ],
  'All Arabic': [
    'The Arab world produces over 1,500 TV drama episodes during Ramadan alone each year.',
    'Arabic TV drama reaches an estimated audience of over 400 million viewers across the world.',
    'Ramadan is the Super Bowl of Arab TV — viewership spikes by over 70% during the holy month.',
    'The first Arabic TV broadcast took place in Egypt in 1960.',
    'Streaming platforms have dramatically changed Arab TV — shows now launch simultaneously across all Arab countries.',
    'Pan-Arab productions with casts from multiple countries have become increasingly common since 2015.',
    'Arabic is the fifth most spoken language in the world, giving Arab TV one of the largest potential audiences globally.',
    'The Murex d\'Or awards have been recognising excellence in Arab TV since 1998.',
    'Arab TV has borrowed heavily from Turkish and Korean drama formats while developing its own distinct identity.',
    'The Arab TV industry generates an estimated $3 billion in annual revenue.',
    'Shahid, the largest Arab streaming platform, has over 50 million subscribers across the Arab world.',
    'Arabic subtitling and dubbing industries employ tens of thousands of people across the Arab world.',
    'The concept of the "30-episode Ramadan series" is unique to Arab TV and has no equivalent in global television.',
    'Egyptian, Syrian, and Lebanese talents often collaborate on Gulf-financed productions, creating a true pan-Arab TV industry.',
    'Arab TV stars can achieve fame across 22 countries simultaneously — a scale few global TV industries can match.',
    'Social media has transformed Arab TV — trending moments from shows now drive next-day viewership spikes.',
    'Netflix launched an Arabic original content division in 2019, recognising the huge size of the Arab TV market.',
    'The Arab TV market has seen production budgets increase by over 400% in the last decade.',
    'Historical dramas set in the Islamic Golden Age have found global audiences beyond the Arab world.',
    'Arab TV has produced some of the world\'s longest-running drama series — some spanning over 20 seasons.',
  ],
};

export default function EraSelectionScreen({ route, navigation }) {
  const { region } = route.params;
  const facts = regionFacts[region] || regionFacts['All Arabic'];
  const [fact] = useState(() => facts[Math.floor(Math.random() * facts.length)]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{region}</Text>
        <Text style={styles.subtitle}>Now pick an era</Text>

        <View style={styles.grid}>
          {eras.map((era) => (
            <TouchableOpacity
              key={era.name}
              style={[styles.card, { backgroundColor: era.cardBg }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Recommendations', { region, era: era.name })}
            >
              <Text style={styles.emoji}>{era.emoji}</Text>
              <Text style={[styles.label, { color: era.color }]}>{era.name}</Text>
              <Text style={styles.description}>{era.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.factCard}>
          <Text style={styles.factLabel}>DID YOU KNOW</Text>
          <Text style={styles.factText}>{fact}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  backBtn: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A08060',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F5E6D0',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#A08060',
    marginBottom: 36,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  card: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    color: '#6B6B70',
    textAlign: 'center',
  },
  factCard: {
    marginTop: 28,
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    padding: 16,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6B70',
    letterSpacing: 1,
    marginBottom: 8,
  },
  factText: {
    fontSize: 14,
    color: '#C9A880',
    lineHeight: 21,
  },
});
