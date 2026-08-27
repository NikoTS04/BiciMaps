import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlassCard from './GlassCard';

interface NavigationHUDProps {
  destination: any;
}

export default function NavigationHUD({ destination }: NavigationHUDProps) {
  return (
    <View style={styles.container}>
      <GlassCard style={styles.hud} intensity={85}>
        <View style={styles.indicator} />
        <View style={styles.content}>
          <Text style={styles.directionText}>Navigating along bike lanes</Text>
          <Text style={styles.streetText} numberOfLines={1}>
            Heading towards: {destination ? destination.name : 'Destination'}
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  hud: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(242, 242, 242, 0.88)',
  },
  indicator: {
    width: 6,
    height: '100%',
    minHeight: 36,
    borderRadius: 3,
    backgroundColor: '#0284c7',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  directionText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  streetText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
});
