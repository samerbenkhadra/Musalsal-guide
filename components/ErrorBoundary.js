import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <Text style={styles.emoji}>😕</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>An unexpected error occurred.</Text>
            <TouchableOpacity style={styles.btn} onPress={this.reset}>
              <Text style={styles.btnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#F5E6D0', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#A08060', textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  btn: { backgroundColor: '#FFAB76', borderRadius: 24, paddingVertical: 13, paddingHorizontal: 48 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
});
