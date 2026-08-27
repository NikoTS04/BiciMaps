import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions, SafeAreaView } from 'react-native';
import GlassCard from './GlassCard';
import { t } from '../utils/i18n';

const { width: screenWidth } = Dimensions.get('window');
const drawerWidth = Math.round(screenWidth * 0.88);

interface LayersDrawerProps {
  lang: 'en' | 'es';
  onOpenDetailSheet: (type: 'languages' | 'layers' | 'favorites') => void;
  onClose: () => void;
}

export default function LayersDrawer({
  lang,
  onOpenDetailSheet,
  onClose,
}: LayersDrawerProps) {
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 3,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -drawerWidth,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={styles.backdropClick} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      {/* Slide-out Drawer */}
      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX }] }]}>
        <GlassCard style={styles.drawerCard} intensity={90}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <View style={styles.profileContainer}>
                <View style={styles.avatar} />
                <Text style={styles.profileName}>Guest Rider</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {/* Account/Language Preference option */}
              <Text style={styles.sectionTitle}>{t('account', lang)}</Text>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onOpenDetailSheet('languages');
                  handleClose();
                }}
              >
                <Text style={styles.menuLabel}>{t('language', lang)}</Text>
                <Text style={styles.menuValue}>
                  {lang === 'en' ? 'English' : 'Español'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Map Layers toggle sheets option */}
              <Text style={styles.sectionTitle}>{t('mapLayers', lang)}</Text>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onOpenDetailSheet('layers');
                  handleClose();
                }}
              >
                <Text style={styles.menuLabel}>{t('mapLayers', lang)}</Text>
                <Text style={styles.menuValue}>❯</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Saved Locations sheet options */}
              <Text style={styles.sectionTitle}>{t('savedLocations', lang)}</Text>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onOpenDetailSheet('favorites');
                  handleClose();
                }}
              >
                <Text style={styles.menuLabel}>{t('savedLocations', lang)}</Text>
                <Text style={styles.menuValue}>❯</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
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
    zIndex: 20,
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
  drawerContainer: {
    width: drawerWidth,
    height: '100%',
  },
  drawerCard: {
    height: '100%',
    borderRadius: 0,
    borderWidth: 0,
    borderRightWidth: 1.5,
    borderRightColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(242, 242, 242, 0.9)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.65)',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginRight: 12,
  },
  profileName: {
    color: '#0f172a',
    fontSize: 16,
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
    padding: 20,
  },
  sectionTitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  menuLabel: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  menuValue: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    marginVertical: 20,
  },
});
