import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlassCard from './GlassCard';

interface CompactSearchProps {
  onOpenDrawer: () => void;
  onExpandSearch: () => void;
}

export default function CompactSearch({ onOpenDrawer, onExpandSearch }: CompactSearchProps) {
  return (
    <View style={styles.container}>
      <GlassCard style={styles.bar}>
        <TouchableOpacity style={styles.menuButton} onPress={onOpenDrawer}>
          <Text style={styles.menuText}>☰</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.searchBar} onPress={onExpandSearch}>
          <Text style={styles.searchPlaceholder}>🔍 Where to?</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchPlaceholder: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 16,
    fontWeight: '500',
  },
});
