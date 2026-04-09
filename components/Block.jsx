import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { COLORS, COLOR_NAMES } from '../constants/colors';

export default function Block({ value }) {
  const isEmpty = value === 0;
  const colorStyle = isEmpty ? styles.empty : { backgroundColor: COLORS[value] };
  const glowStyle = !isEmpty && value === 7 ? styles.whiteGlow : null;

  return (
    <View style={[styles.block, colorStyle, glowStyle]}>
      {!isEmpty && (
        <Text style={styles.text}>
          {COLOR_NAMES[value]}
        </Text>
      )}
    </View>
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
