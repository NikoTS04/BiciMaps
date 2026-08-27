import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Animated, Dimensions } from 'react-native';
import GlassCard from './GlassCard';
import { t } from '../utils/i18n';

const { height: screenHeight } = Dimensions.get('window');
const sheetHeight = Math.round(screenHeight * 0.93);
const snapY = screenHeight - sheetHeight;

interface MenuDetailSheetProps {
  type: 'languages' | 'layers' | 'favorites' | null;
  lang: 'en' | 'es';
  showBikeLanes: boolean;
  showAmenities: boolean;
  customFavorites: any[];
  onToggleBikeLanes: () => void;
  onToggleAmenities: () => void;
  onSelectLanguage: (language: 'en' | 'es') => void;
  onSelectFavorite: (fav: any) => void;
  onDeleteFavorite: (id: string) => void;
  onClose: () => void;
}

export default function MenuDetailSheet({
  type,
  lang,
  showBikeLanes,
  showAmenities,
  customFavorites,
  onToggleBikeLanes,
  onToggleAmenities,
  onSelectLanguage,
  onSelectFavorite,
  onDeleteFavorite,
  onClose,
}: MenuDetailSheetProps) {
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (type) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: snapY,
          useNativeDriver: true,
          bounciness: 4,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [type]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!type) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={styles.backdropClick} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet Content */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <GlassCard style={styles.card} intensity={90}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {type === 'languages' && t('languageSelection', lang)}
              {type === 'layers' && t('mapLayers', lang)}
              {type === 'favorites' && t('savedLocations', lang)}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {type === 'languages' && (
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[styles.optionItem, lang === 'en' && styles.optionItemActive]}
                  onPress={() => {
                    onSelectLanguage('en');
                    handleClose();
                  }}
                >
                  <Text style={[styles.optionText, lang === 'en' && styles.optionTextActive]}>
                    {t('english', lang)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, lang === 'es' && styles.optionItemActive]}
                  onPress={() => {
                    onSelectLanguage('es');
                    handleClose();
                  }}
                >
                  <Text style={[styles.optionText, lang === 'es' && styles.optionTextActive]}>
                    {t('spanish', lang)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {type === 'layers' && (
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[styles.optionItem, showBikeLanes && styles.optionItemActive]}
                  onPress={onToggleBikeLanes}
                >
                  <Text style={[styles.optionText, showBikeLanes && styles.optionTextActive]}>
                    {t('bikeLanes', lang)}: {showBikeLanes ? t('visible', lang) : t('hidden', lang)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, showAmenities && styles.optionItemActive]}
                  onPress={onToggleAmenities}
                >
                  <Text style={[styles.optionText, showAmenities && styles.optionTextActive]}>
                    {t('parkingSpots', lang)}: {showAmenities ? t('visible', lang) : t('hidden', lang)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {type === 'favorites' && (
              <View style={styles.optionsList}>
                {customFavorites.length === 0 ? (
                  <Text style={styles.emptyText}>{t('noSavedLocations', lang)}</Text>
                ) : (
                  customFavorites.map((fav) => (
                    <View key={fav.id} style={styles.favRow}>
                      <TouchableOpacity
                        style={styles.favDetails}
                        onPress={() => {
                          onSelectFavorite(fav);
                          handleClose();
                        }}
                      >
                        <Text style={styles.favTitle}>{fav.name}</Text>
                        <Text style={styles.favSubtitle} numberOfLines={1}>
                          {fav.address}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => onDeleteFavorite(fav.id)}
                      >
                        <Text style={styles.deleteText}>{t('eliminate', lang)}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </GlassCard>
      </Animated.View>
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
    zIndex: 22,
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
  backdropClick: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    width: '100%',
    height: sheetHeight,
  },
  card: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    height: '100%',
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(242, 242, 242, 0.9)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.55)',
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: 'bold',
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
  content: {
    flex: 1,
  },
  optionsList: {
    gap: 10,
  },
  optionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  optionItemActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  optionText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: 'bold',
  },
  optionTextActive: {
    color: '#0284c7',
  },
  favRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  favDetails: {
    flex: 1,
    marginRight: 12,
  },
  favTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
  },
  favSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 30,
  },
});
