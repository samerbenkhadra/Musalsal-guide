import React, { useRef, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PostHogProvider, usePostHog } from 'posthog-react-native';

import RegionSelectionScreen from './screens/RegionSelectionScreen';
import RecommendationsScreen from './screens/RecommendationsScreen';
import EpisodeDetailScreen from './screens/EpisodeDetailScreen';
import ActorProfileScreen from './screens/ActorProfileScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import LoginScreen from './screens/LoginScreen';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const Stack = createNativeStackNavigator();

function AppContent({ navigationRef }) {
  const { user, loading } = useAuth();
  const [skipped, setSkipped] = useState(false);

  if (loading) return null;
  if (!user && !skipped) {
    return <LoginScreen onSkip={() => setSkipped(true)} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <PostHogProvider
        apiKey="phc_wzZd2ttJJbtpaGi69gVN3aeGfyFqUgbZyCrYmzQmaqeF"
        options={{ host: 'https://eu.i.posthog.com' }}
        autocapture={{ captureScreens: false }}
      >
        <NavigationTracker navigationRef={navigationRef} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RegionSelection" component={RegionSelectionScreen} />
          <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
          <Stack.Screen name="EpisodeDetail" component={EpisodeDetailScreen} />
          <Stack.Screen name="ActorProfile" component={ActorProfileScreen} />
          <Stack.Screen name="Discover" component={DiscoverScreen} />
        </Stack.Navigator>
      </PostHogProvider>
    </NavigationContainer>
  );
}

function NavigationTracker({ navigationRef }) {
  const posthog = usePostHog();
  const routeNameRef = useRef(null);

  useEffect(() => {
    const unsubscribe = navigationRef.current?.addListener('state', () => {
      const currentRoute = navigationRef.current?.getCurrentRoute();
      if (currentRoute && currentRoute.name !== routeNameRef.current) {
        routeNameRef.current = currentRoute.name;
        posthog?.screen(currentRoute.name);
      }
    });
    return unsubscribe;
  }, [posthog, navigationRef]);

  return null;
}

export default function App() {
  const navigationRef = useRef(null);

  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent navigationRef={navigationRef} />
      </AuthProvider>
    </LanguageProvider>
  );
}
