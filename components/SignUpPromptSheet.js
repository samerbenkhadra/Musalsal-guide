import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';

export default function SignUpPromptSheet({ visible, onClose, onSignUp, message, language }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.emoji}>⭐</Text>
        <Text style={styles.title}>
          {language === 'ar' ? 'أنشئ حساباً' : 'Create an account'}
        </Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.signUpBtn} onPress={() => { onClose(); onSignUp(); }}>
          <Text style={styles.signUpText}>
            {language === 'ar' ? 'إنشاء حساب' : 'Sign up'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>
            {language === 'ar' ? 'ليس الآن' : 'Not now'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#2A2A2C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: { width: 40, height: 4, backgroundColor: '#3A3A3C', borderRadius: 2, marginBottom: 24 },
  emoji: { fontSize: 36, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#F5E6D0', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#A08060', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  signUpBtn: {
    backgroundColor: '#FFAB76',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  signUpText: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 14, color: '#6B6B70' },
});
