import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { COLORS, COLOR_NAMES } from '../constants/colors';

const CELL_SIZE = 70;
const CELL_MARGIN = 5;
const CELL_TOTAL = CELL_SIZE + CELL_MARGIN * 2; // 80
const GRID_PADDING = 10;

// Background grid cells
function BackgroundGrid() {
  return (
    <View style={styles.backgroundContainer}>
      {Array.from({ length: 16 }).map((_, i) => (
        <View key={i} style={styles.backgroundCell} />
      ))}
    </View>
  );
}

// Animated Tile component
function AnimatedTile({ tile, movement, merge, isNew, isPoof }) {
  const { id, value, row, col } = tile;
  
  // Calculate current position (in pixels)
  const currentLeft = GRID_PADDING + col * CELL_TOTAL + CELL_MARGIN;
  const currentTop = GRID_PADDING + row * CELL_TOTAL + CELL_MARGIN;
  
  // Calculate previous position for animation
  let prevLeft = currentLeft;
  let prevTop = currentTop;
  
  if (movement) {
    prevLeft = GRID_PADDING + movement.from.col * CELL_TOTAL + CELL_MARGIN;
    prevTop = GRID_PADDING + movement.from.row * CELL_TOTAL + CELL_MARGIN;
  }
  
  // Animation refs
  const leftAnim = useRef(new Animated.Value(prevLeft)).current;
  const topAnim = useRef(new Animated.Value(prevTop)).current;
  const scaleAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  // Track displayed value (for merge animation)
  const [displayValue, setDisplayValue] = useState(value);
  
  // Slide animation when position changes
  useEffect(() => {
    if (movement || isNew) {
      Animated.parallel([
        Animated.timing(leftAnim, {
          toValue: currentLeft,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(topAnim, {
          toValue: currentTop,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [row, col, movement, isNew]);
  
  // Merge pulse animation (after slide completes)
  useEffect(() => {
    if (merge) {
      // First update the displayed value
      setDisplayValue(merge.newValue);
      
      // Then pulse animation
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [merge]);
  
  // Poof animation (scale down and fade)
  useEffect(() => {
    if (isPoof) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isPoof]);
  
  const colorStyle = { backgroundColor: COLORS[displayValue] };
  const glowStyle = displayValue === 7 ? styles.whiteGlow : null;
  
  return (
    <Animated.View
      style={[
        styles.tile,
        colorStyle,
        glowStyle,
        {
          left: leftAnim,
          top: topAnim,
          opacity: opacityAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) }
          ],
        }
      ]}
    >
      <Text style={styles.tileText}>{COLOR_NAMES[displayValue]}</Text>
    </Animated.View>
  );
}

export default function Grid({ tiles, movements, merges, poofs, newTileId }) {
  // Create maps for quick lookup
  const movementMap = {};
  movements.forEach(m => {
    movementMap[m.tileId] = m;
  });
  
  const mergeMap = {};
  merges.forEach(m => {
    mergeMap[m.targetId] = m; // Target tile gets the merge info
  });
  
  const poofIds = new Set(poofs.map(p => p.tileId));
  
  return (
    <View style={styles.grid}>
      <BackgroundGrid />
      {tiles.map(tile => (
        <AnimatedTile
          key={tile.id}
          tile={tile}
          movement={movementMap[tile.id]}
          merge={mergeMap[tile.id]}
          isNew={tile.id === newTileId}
          isPoof={poofIds.has(tile.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: CELL_TOTAL * 4 + GRID_PADDING * 2,
    height: CELL_TOTAL * 4 + GRID_PADDING * 2,
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    left: GRID_PADDING,
    top: GRID_PADDING,
    right: GRID_PADDING,
    bottom: GRID_PADDING,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  backgroundCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_MARGIN,
    borderRadius: 8,
    backgroundColor: '#3d3d5c',
  },
  tile: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteGlow: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  tileText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
