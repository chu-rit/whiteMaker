import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { COLORS, COLOR_NAMES } from '../constants/colors';

export default function AnimatedBlock({ value, isNew, translateX = 0, translateY = 0 }) {
  const isEmpty = value === 0;
  const slideAnim = useRef(new Animated.ValueXY({ x: translateX, y: translateY })).current;
  const scaleAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  // Slide animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: { x: translateX, y: translateY },
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [translateX, translateY]);

  // New block animation
  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew]);

  const colorStyle = isEmpty ? styles.empty : { backgroundColor: COLORS[value] };
  const glowStyle = !isEmpty && value === 7 ? styles.whiteGlow : null;

  return (
    <Animated.View
      style={[
        styles.block,
        colorStyle,
        glowStyle,
        {
          transform: [
            { translateX: slideAnim.x },
            { translateY: slideAnim.y },
            { scale: scaleAnim }
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      {!isEmpty && (
        <Text style={styles.text}>
          {COLOR_NAMES[value]}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: 70,
    height: 70,
    margin: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    backgroundColor: '#3d3d5c',
  },
  whiteGlow: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
