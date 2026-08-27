import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlassCard from './GlassCard';
import { t } from '../utils/i18n';

interface PinDetailsProps {
  pinLocation: any;
  lang: 'en' | 'es';
  onGoTo: () => void;
  onStartFrom: () => void;
  onSaveFavorite: () => void; // Trigger naming input overlay outside MapLibre view tree
  onClose: () => void;
}

export default function PinDetails({
  pinLocation,
  lang,
  onGoTo,
  onStartFrom,
  onSaveFavorite,
  onClose,
}: PinDetailsProps) {
  return (
    <View style={styles.bubbleContainer}>
      <GlassCard style={styles.card} intensity={85}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {pinLocation ? pinLocation.name : t('droppedPin', lang)}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onSaveFavorite} style={styles.saveActionBtn}>
              <Text style={styles.saveActionTxt}>{t('save', lang)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.button} onPress={onStartFrom}>
            <Text style={styles.buttonTxt}>{t('startFrom', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onGoTo}>
            <Text style={styles.primaryButtonTxt}>{t('goTo', lang)}</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
      {/* Downward Spike pointing to location */}
      <View style={styles.spike} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    width: 250,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -60 }],
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(242, 242, 242, 0.88)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  saveActionTxt: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTxt: {
    color: '#475569',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  buttonTxt: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: '#0284c7',
  },
  primaryButtonTxt: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  spike: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: 'rgba(242, 242, 242, 0.88)',
    marginTop: -1.5,
  },
});
