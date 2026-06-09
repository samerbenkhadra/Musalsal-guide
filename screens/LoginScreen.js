import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ onSkip }) {
  const { signInWithApple, signInWithEmail, verifyOtp } = useAuth();
  const posthog = usePostHog();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const handleApple = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    if (error) {
      Alert.alert('Error', 'Sign in failed. Please try again.');
    } else {
      posthog?.capture('login_completed', { method: 'apple' });
    }
    setLoading(false);
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await signInWithEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', 'Could not send code. Please try again.');
    } else {
      setOtpSent(true);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    const { error } = await verifyOtp(email.trim(), otp.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Invalid code', 'Please check your email and try again.');
    } else {
      posthog?.capture('login_completed', { method: 'email' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Image
          source={require('../assets/Musalsal logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>MusalsalGo</Text>
        <Text style={styles.subtitle}>دليلك للمسلسلات العربية</Text>

        <View style={styles.buttons}>
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleApple}
            />
          )}

          {!otpSent ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TouchableOpacity style={styles.emailButton} onPress={handleEmailSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.emailButtonText}>Continue with Email</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.otpLabel}>Enter the code sent to {email}</Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
              />
              <TouchableOpacity style={styles.emailButton} onPress={handleOtpSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.emailButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.spamHint}>Check your spam/junk folder if you don't see it</Text>
              <TouchableOpacity onPress={() => setOtpSent(false)}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.skipButton} onPress={() => { posthog?.capture('guest_continued'); onSkip(); }}>
            <Text style={styles.skipText}>Continue as guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 48,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    width: '100%',
  },
  emailButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  otpLabel: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
  spamHint: { fontSize: 13, color: '#A08060', textAlign: 'center', marginBottom: 8 },
  backText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  skipButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    color: '#666',
    fontSize: 15,
  },
});
