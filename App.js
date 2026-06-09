import React, { useRef, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PostHogProvider, usePostHog } from 'posthog-react-native';

import DiscoverScreen from './screens/DiscoverScreen';
import BrowseScreen from './screens/BrowseScreen';
import ActorBrowseScreen from './screens/ActorBrowseScreen';
import RegionBrowseScreen from './screens/RegionBrowseScreen';
import ThemeBrowseScreen from './screens/ThemeBrowseScreen';
import RecommendationsScreen from './screens/RecommendationsScreen';
import EpisodeDetailScreen from './screens/EpisodeDetailScreen';
import ActorProfileScreen from './screens/ActorProfileScreen';
import ActivityScreen from './screens/ActivityScreen';
import ProfileScreen from './screens/ProfileScreen';
import CategoryScreen from './screens/CategoryScreen';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

const ONBOARDING_KEY = 'onboarding_complete_v1';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const BrowseStack = createNativeStackNavigator();

function BrowseNavigator() {
  return (
    <BrowseStack.Navigator screenOptions={{ headerShown: false }}>
      <BrowseStack.Screen name="BrowseScreen" component={BrowseScreen} />
      <BrowseStack.Screen name="ActorBrowse" component={ActorBrowseScreen} />
      <BrowseStack.Screen name="RegionBrowse" component={RegionBrowseScreen} />
      <BrowseStack.Screen name="ThemeBrowse" component={ThemeBrowseScreen} />
      <BrowseStack.Screen name="Recommendations" component={RecommendationsScreen} />
    </BrowseStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#2E2E30',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#FFAB76',
        tabBarInactiveTintColor: '#6B6B70',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="flash-outline" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Home"
        component={DiscoverScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Explore"
        component={BrowseNavigator}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export const ShowLoginContext = React.createContext(() => {});

function AppContent({ navigationRef }) {
  const { user, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(null);
  const [loginSkipped, setLoginSkipped] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDone(true);
  };

  if (loading || onboardingDone === null) return null;

  if (!onboardingDone) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  if ((!user && !loginSkipped) || showLoginModal) {
    return <LoginScreen onSkip={() => { setLoginSkipped(true); setShowLoginModal(false); }} />;
  }

  return (
    <ShowLoginContext.Provider value={() => setShowLoginModal(true)}>
      <NavigationContainer ref={navigationRef}>
          <NavigationTracker navigationRef={navigationRef} />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="EpisodeDetail" component={EpisodeDetailScreen} />
            <Stack.Screen name="ActorProfile" component={ActorProfileScreen} />
            <Stack.Screen name="Category" component={CategoryScreen} />
          </Stack.Navigator>
      </NavigationContainer>
    </ShowLoginContext.Provider>
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
    <ErrorBoundary>
      <PostHogProvider
        apiKey="phc_wzZd2ttJJbtpaGi69gVN3aeGfyFqUgbZyCrYmzQmaqeF"
        options={{ host: 'https://eu.i.posthog.com' }}
        autocapture={{ captureScreens: false }}
      >
        <LanguageProvider>
          <AuthProvider>
            <AppContent navigationRef={navigationRef} />
          </AuthProvider>
        </LanguageProvider>
      </PostHogProvider>
    </ErrorBoundary>
  );
}
