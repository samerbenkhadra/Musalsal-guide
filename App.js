import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RegionSelectionScreen from './screens/RegionSelectionScreen';
import EraSelectionScreen from './screens/EraSelectionScreen';
import RecommendationsScreen from './screens/RecommendationsScreen';
import EpisodeDetailScreen from './screens/EpisodeDetailScreen';
import { LanguageProvider } from './context/LanguageContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <LanguageProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RegionSelection" component={RegionSelectionScreen} />
          <Stack.Screen name="EraSelection" component={EraSelectionScreen} />
          <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
          <Stack.Screen name="EpisodeDetail" component={EpisodeDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
