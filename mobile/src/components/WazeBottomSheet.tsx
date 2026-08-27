import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Animated, PanResponder, Dimensions, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import GlassCard from './GlassCard';
import SwipeableItem from './SwipeableItem';
import { t } from '../utils/i18n';

const { height: screenHeight } = Dimensions.get('window');

// Define snap heights from screen bottom
const collapsedY = screenHeight - 110;
const defaultY = screenHeight - Math.round(screenHeight * 0.38);
const expandedY = screenHeight - Math.round(screenHeight * 0.93);

interface WazeBottomSheetProps {
  origin: any;
  destination: any;
  originSearchQuery: string;
  searchQuery: string;
  searchFocused: 'origin' | 'destination';
  searchResults: any[];
  recentSearches: any[];
  sheetState: 'collapsed' | 'default' | 'expanded';
  lang: 'en' | 'es';
  onSearchTextChange: (text: string) => void;
  onFocusSearch: (type: 'origin' | 'destination') => void;
  onSelectLocation: (item: any) => void;
  onClearOrigin: () => void;
  onClearSearch: () => void;
  onNavigateToFavorite: (type: 'home' | 'work') => void;
  onOpenAddFavorite: () => void;
  onShowOptions: (item: any) => void;
  onStateChange: (state: 'collapsed' | 'default' | 'expanded') => void;
}

export default function WazeBottomSheet({
  origin,
  destination,
  originSearchQuery,
  searchQuery,
  searchFocused,
  searchResults,
  recentSearches,
  sheetState,
  lang,
  onSearchTextChange,
  onFocusSearch,
  onSelectLocation,
  onClearOrigin,
  onClearSearch,
  onNavigateToFavorite,
  onOpenAddFavorite,
  onShowOptions,
  onStateChange,
}: WazeBottomSheetProps) {
  const translateY = useRef(new Animated.Value(defaultY)).current;
  const currentY = useRef(defaultY);

  // Sync state changes from parent (e.g. map drags setting state to collapsed)
  useEffect(() => {
    let target = defaultY;
    if (sheetState === 'collapsed') target = collapsedY;
    else if (sheetState === 'expanded') target = expandedY;
    
    Animated.spring(translateY, {
      toValue: target,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    currentY.current = target;
  }, [sheetState]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Hijack vertical drags on handle or outer elements
        const { dy, dx } = gestureState;
        return Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 4;
      },
      onPanResponderGrant: () => {
        translateY.setOffset(currentY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const nextVal = gestureState.dy;
        // Clamp to prevent dragging past top bounds
        const absoluteY = currentY.current + nextVal;
        if (absoluteY < expandedY) {
          translateY.setValue(expandedY - currentY.current);
        } else {
          translateY.setValue(nextVal);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        const releasedY = currentY.current + gestureState.dy;

        // Snap to nearest point
        const distCollapsed = Math.abs(releasedY - collapsedY);
        const distDefault = Math.abs(releasedY - defaultY);
        const distExpanded = Math.abs(releasedY - expandedY);

        let finalY = defaultY;
        let finalState: 'collapsed' | 'default' | 'expanded' = 'default';

        if (distCollapsed < distDefault && distCollapsed < distExpanded) {
          finalY = collapsedY;
          finalState = 'collapsed';
          Keyboard.dismiss();
        } else if (distExpanded < distCollapsed && distExpanded < distDefault) {
          finalY = expandedY;
          finalState = 'expanded';
        }

        Animated.spring(translateY, {
          toValue: finalY,
          useNativeDriver: true,
          bounciness: 4,
        }).start();

        currentY.current = finalY;
        onStateChange(finalState);
      },
    })
  ).current;

  // Handle focusing search
  const handleInputFocus = (type: 'origin' | 'destination') => {
    onFocusSearch(type);
    if (sheetState !== 'expanded') {
      onStateChange('expanded');
    }
  };

  const isSearching = searchQuery.length > 0 || originSearchQuery.length > 0;

  return (
    <Animated.View
      style={[
        styles.sheetContainer,
        {
          transform: [{ translateY }],
          height: screenHeight,
        },
      ]}
    >
      <GlassCard style={styles.card} intensity={90}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          {/* Top Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.handle} />
          </View>

          {/* Search inputs row wrapper */}
          <View style={styles.paddedContent}>
            {sheetState === 'expanded' ? (
              <View style={styles.searchBlock}>
                {/* Origin input */}
                <View style={[styles.searchRow, searchFocused === 'origin' && styles.searchRowActive]}>
                  <Text style={styles.label}>{t('from', lang)}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="My Location"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    value={origin ? origin.name : originSearchQuery}
                    onChangeText={onSearchTextChange}
                    onFocus={() => handleInputFocus('origin')}
                  />
                  {origin && (
                    <TouchableOpacity style={styles.clearBtn} onPress={onClearOrigin}>
                      <Text style={styles.clearTxt}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Destination input */}
                <View style={[styles.searchRow, searchFocused === 'destination' && styles.searchRowActive]}>
                  <Text style={styles.label}>{t('to', lang)}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('searchPlaceholderDetailed', lang)}
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    value={destination ? destination.name : searchQuery}
                    onChangeText={onSearchTextChange}
                    onFocus={() => handleInputFocus('destination')}
                  />
                  {destination && (
                    <TouchableOpacity style={styles.clearBtn} onPress={onClearSearch}>
                      <Text style={styles.clearTxt}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              // Collapsed / Default single input display
              <View style={styles.compactSearchRow}>
                <Text style={styles.label}>{t('whereTo', lang)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('searchPlaceholder', lang)}
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  value={destination ? destination.name : searchQuery}
                  onChangeText={onSearchTextChange}
                  onFocus={() => handleInputFocus('destination')}
                />
                {destination && (
                  <TouchableOpacity style={styles.clearBtn} onPress={onClearSearch}>
                    <Text style={styles.clearTxt}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Shortcut buttons */}
            {sheetState !== 'collapsed' && !isSearching && (
              <View style={styles.shortcutsRow}>
                <TouchableOpacity style={styles.shortcutBtn} onPress={() => onNavigateToFavorite('home')}>
                  <Text style={styles.shortcutTxt}>{t('home', lang)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shortcutBtn} onPress={() => onNavigateToFavorite('work')}>
                  <Text style={styles.shortcutTxt}>{t('work', lang)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shortcutBtn} onPress={onOpenAddFavorite}>
                  <Text style={styles.shortcutTxt}>{t('newPlace', lang)}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* List Title (display only when search list is inactive) */}
            {sheetState !== 'collapsed' && !isSearching && recentSearches.length > 0 && (
              <Text style={styles.sectionTitle}>{t('recentSearches', lang)}</Text>
            )}
          </View>

          {/* List Content: geocoding results or side-to-side recent searches list */}
          {sheetState !== 'collapsed' && (
            <View style={styles.listContainer}>
              {isSearching ? (
                // Active search results
                searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContentPadded}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.resultItem} onPress={() => onSelectLocation(item)}>
                        <View style={styles.resultDetails}>
                          <Text style={styles.resultTitle} numberOfLines={1}>
                            {item.name}
                          </Text>
                          {item.isOffline && <Text style={styles.offlineText}>Offline</Text>}
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <Text style={styles.emptyText}>{t('noMatches', lang)}</Text>
                )
              ) : (
                // Recent searches full-bleed side-to-side list row items
                recentSearches.length > 0 && (
                  <FlatList
                    data={recentSearches}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <SwipeableItem
                        onPressItem={() => onSelectLocation(item)}
                        onPressOptions={() => onShowOptions(item)}
                      >
                        <Text style={styles.recentItemText} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </SwipeableItem>
                    )}
                  />
                )
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  card: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    height: '100%',
    paddingHorizontal: 0, // Removed padding to allow full bleed list side-to-side
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(242, 242, 242, 0.88)',
  },
  keyboardAvoid: {
    flex: 1,
  },
  dragHandleArea: {
    height: 30,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  paddedContent: {
    paddingHorizontal: 20,
  },
  compactSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchBlock: {
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchRowActive: {
    borderColor: '#0284c7',
    backgroundColor: '#ffffff',
  },
  label: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 6,
  },
  clearTxt: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shortcutsRow: {
    flexDirection: 'row',
    marginTop: 14,
    justifyContent: 'space-between',
    gap: 6,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  shortcutTxt: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    marginTop: 12,
  },
  listContentPadded: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 4,
  },
  recentItemText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '500',
  },
  resultItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  resultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  offlineText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
});
