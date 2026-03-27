import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MoodSelectionScreen from './screens/MoodSelectionScreen';
import RecommendationsScreen from './screens/RecommendationsScreen';
import EpisodeDetailScreen from './screens/EpisodeDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MoodSelection" component={MoodSelectionScreen} />
        <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
        <Stack.Screen name="EpisodeDetail" component={EpisodeDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
