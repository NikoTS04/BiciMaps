import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlassCard from './GlassCard';

interface OptionsSheetProps {
  item: any;
  onEliminate: () => void;
  onAddFavorite: () => void;
  onClose: () => void;
}

export default function OptionsSheet({ item, onEliminate, onAddFavorite, onClose }: OptionsSheetProps) {
  if (!item) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onAddFavorite}>
            <Text style={styles.actionText}>Add as Favorite</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionButton} onPress={onEliminate}>
            <Text style={[styles.actionText, styles.eliminateText]}>Eliminate</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 25,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    paddingBottom: 36,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#0f172a',
    fontSize: 16,
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
  actions: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#0284c7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  eliminateText: {
    color: '#ef4444',
  },
});
