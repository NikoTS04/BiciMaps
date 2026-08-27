import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export default function GlassCard({
  children,
  style,
  intensity = 85,
  tint = 'light',
}: GlassCardProps) {
  return (
    <BlurView intensity={intensity} tint={tint} style={[styles.glassCard, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(235, 235, 235, 0.84)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
});
