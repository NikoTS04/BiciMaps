import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, FlatList } from 'react-native';
import GlassCard from './GlassCard';

interface SearchPanelProps {
  origin: any;
  destination: any;
  originSearchQuery: string;
  searchQuery: string;
  searchFocused: 'origin' | 'destination';
  searchResults: any[];
  onSearchTextChange: (text: string) => void;
  onFocusSearch: (type: 'origin' | 'destination') => void;
  onSelectLocation: (item: any) => void;
  onClearOrigin: () => void;
  onClearSearch: () => void;
  onClose: () => void;
  onNavigateToFavorite: (type: 'home' | 'work') => void;
}

export default function SearchPanel({
  origin,
  destination,
  originSearchQuery,
  searchQuery,
  searchFocused,
  searchResults,
  onSearchTextChange,
  onFocusSearch,
  onSelectLocation,
  onClearOrigin,
  onClearSearch,
  onClose,
  onNavigateToFavorite,
}: SearchPanelProps) {
  return (
    <View style={styles.overlay}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Where to?</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Origin Row */}
        <View style={[styles.inputRow, searchFocused === 'origin' && styles.inputRowActive]}>
          <Text style={styles.prefix}>🟢 From:</Text>
          <TextInput
            style={styles.input}
            placeholder="My Location (GPS)"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={origin ? origin.name : originSearchQuery}
            onChangeText={onSearchTextChange}
            onFocus={() => onFocusSearch('origin')}
          />
          {origin && (
            <TouchableOpacity style={styles.clearButton} onPress={onClearOrigin}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Destination Row */}
        <View style={[styles.inputRow, searchFocused === 'destination' && styles.inputRowActive]}>
          <Text style={styles.prefix}>🔴 To:</Text>
          <TextInput
            style={styles.input}
            placeholder="Search address or bike facility..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={destination ? destination.name : searchQuery}
            onChangeText={onSearchTextChange}
            onFocus={() => onFocusSearch('destination')}
          />
          {destination && (
            <TouchableOpacity style={styles.clearButton} onPress={onClearSearch}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Favorites shortcuts */}
        {!destination && searchQuery.length === 0 && originSearchQuery.length === 0 && (
          <View style={styles.favoritesRow}>
            <TouchableOpacity style={styles.favButton} onPress={() => onNavigateToFavorite('home')}>
              <Text style={styles.favButtonText}>🏠 Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.favButton} onPress={() => onNavigateToFavorite('work')}>
              <Text style={styles.favButtonText}>💼 Work</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results List */}
        {searchResults.length > 0 && (
          <FlatList
            style={styles.resultsList}
            data={searchResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => onSelectLocation(item)}>
                <Text style={styles.resultText} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.isOffline && (
                  <View style={styles.offlineBadge}>
                    <Text style={styles.offlineText}>Offline</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
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
    zIndex: 15,
  },
  card: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputRowActive: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  prefix: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 50,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 6,
  },
  clearText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 10,
  },
  favoritesRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  favButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  favButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsList: {
    maxHeight: 200,
    marginTop: 12,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultText: {
    color: '#f1f5f9',
    fontSize: 14,
    flex: 1,
  },
  offlineBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginLeft: 8,
  },
  offlineText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '600',
  },
});
