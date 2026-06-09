import React from 'react';
import { Animated } from 'react-native';

const pulse = new Animated.Value(0.35);
Animated.loop(
  Animated.sequence([
    Animated.timing(pulse, { toValue: 0.75, duration: 900, useNativeDriver: true }),
    Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
  ])
).start();

export default function Skeleton({ width, height, borderRadius = 8, style }) {
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#2A2A2C', opacity: pulse }, style]}
    />
  );
}
