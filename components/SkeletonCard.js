import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.poster} />
      <View style={styles.content}>
        <View style={styles.titleBar} />
        <View style={styles.metaBar} />
        <View style={styles.descBar} />
        <View style={[styles.descBar, { width: '60%' }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
    height: 105,
  },
  poster: {
    width: 70,
    backgroundColor: '#3A3A3C',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 8,
  },
  titleBar: {
    height: 14,
    width: '75%',
    backgroundColor: '#3A3A3C',
    borderRadius: 6,
  },
  metaBar: {
    height: 10,
    width: '40%',
    backgroundColor: '#3A3A3C',
    borderRadius: 6,
  },
  descBar: {
    height: 10,
    width: '90%',
    backgroundColor: '#3A3A3C',
    borderRadius: 6,
  },
});
