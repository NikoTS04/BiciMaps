import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlassCard from './GlassCard';

interface RoutePreviewProps {
  destination: any;
  etaString: string;
  durationMin: number;
  routeDistance: number;
  isNavigating: boolean;
  onToggleNavigation: () => void;
  onSaveFavorite: (type: 'home' | 'work') => void;
  onClose: () => void;
}

export default function RoutePreview({
  destination,
  etaString,
  durationMin,
  routeDistance,
  isNavigating,
  onToggleNavigation,
  onSaveFavorite,
  onClose,
}: RoutePreviewProps) {
  return (
    <View style={styles.overlay}>
      <GlassCard style={styles.card} intensity={90}>
        <View style={styles.header}>
          <Text style={styles.destName} numberOfLines={1}>
            {destination ? destination.name : 'Destination'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Travel Info Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{etaString}</Text>
            <Text style={styles.metricLabel}>ETA</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{durationMin} min</Text>
            <Text style={styles.metricLabel}>DURATION</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{routeDistance.toFixed(2)} km</Text>
            <Text style={styles.metricLabel}>DISTANCE</Text>
          </View>
        </View>

        {/* Buttons (Minimalist, super rounded, emoji-free) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.goButton, isNavigating ? styles.goButtonStop : styles.goButtonStart]}
            onPress={onToggleNavigation}
          >
            <Text style={styles.goButtonText}>
              {isNavigating ? 'Stop Nav' : 'Start Nav'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onSaveFavorite('home')}>
            <Text style={styles.actionButtonText}>Set Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onSaveFavorite('work')}>
            <Text style={styles.actionButtonText}>Set Work</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  card: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    backgroundColor: 'rgba(242, 242, 242, 0.9)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  destName: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    color: '#0284c7', // Sky Blue/Waze Blue
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  goButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButtonStart: {
    backgroundColor: '#0284c7',
  },
  goButtonStop: {
    backgroundColor: '#ef4444',
  },
  goButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionButtonText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
