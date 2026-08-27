import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, PanResponder } from 'react-native';

interface SwipeableItemProps {
  children: React.ReactNode;
  onPressOptions: () => void;
  onPressItem: () => void;
}

export default function SwipeableItem({ children, onPressOptions, onPressItem }: SwipeableItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpened, setIsOpened] = useState(false);
  const swipeLimit = -80; // Width of the options button area

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // Respond to horizontal swipe to the left, ignore vertical list scrolls
        return Math.abs(dx) > Math.abs(dy) && dx < -8;
      },
      onPanResponderMove: (_, gestureState) => {
        let newX = gestureState.dx;
        if (newX < swipeLimit) {
          // Add drag resistance
          newX = swipeLimit + (newX - swipeLimit) * 0.15;
        } else if (newX > 0) {
          newX = 0;
        }
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = swipeLimit / 2;
        if (gestureState.dx < threshold) {
          // Snap open
          Animated.spring(translateX, {
            toValue: swipeLimit,
            useNativeDriver: true,
            bounciness: 3,
          }).start();
          setIsOpened(true);
        } else {
          // Snap closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 3,
          }).start();
          setIsOpened(false);
        }
      },
    })
  ).current;

  // Auto-close swipe row when options clicked
  const handleOptionsTap = () => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
    setIsOpened(false);
    onPressOptions();
  };

  return (
    <View style={styles.container}>
      {/* Blue Background Options Block */}
      <View 
        style={styles.optionsContainer}
        pointerEvents={isOpened ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.optionsButton} onPress={handleOptionsTap}>
          <Text style={styles.optionsText}>Options</Text>
        </TouchableOpacity>
      </View>

      {/* Foreground Swipeable Item Row */}
      <Animated.View
        style={[styles.foreground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity activeOpacity={0.9} style={styles.touchable} onPress={onPressItem}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0284c7', // Blue Options Underlay
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  optionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  optionsButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  foreground: {
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  touchable: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
});
