import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, PanResponder, Image } from 'react-native';
import Grid from '../components/Grid';
import { createInitialState, moveGrid, canMove, tilesToGrid } from '../utils/gameLogic';

// SVG with mix-blend-mode for proper additive color mixing (pre-encoded base64)
const rgbDiagramSVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3R5bGU9Imlzb2xhdGlvbjogaXNvbGF0ZTsiPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iMTAwIiBmaWxsPSIjMDBGRjAwIiBzdHlsZT0ibWl4LWJsZW5kLW1vZGU6IHNjcmVlbjsiLz48Y2lyY2xlIGN4PSIxNDAiIGN5PSIyNTAiIHI9IjEwMCIgZmlsbD0iI0ZGMDAwMCIgc3R5bGU9Im1peC1ibGVuZC1tb2RlOiBzY3JlZW47Ii8+PGNpcmNsZSBjeD0iMjYwIiBjeT0iMjUwIiByPSIxMDAiIGZpbGw9IiMwMDAwRkYiIHN0eWxlPSJtaXgtYmxlbmQtbW9kZTogc2NyZWVuOyIvPjwvZz48L3N2Zz4=';

function ColorGuide() {
  return (
    <View style={guideStyles.container}>
      <Image source={{ uri: rgbDiagramSVG }} style={guideStyles.diagramImage} />
    </View>
  );
}

const guideStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  diagramImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
});

export default function GameScreen() {
  const [tiles, setTiles] = useState(createInitialState);
  const [score, setScore] = useState(0);
  const [movements, setMovements] = useState([]);
  const [merges, setMerges] = useState([]);
  const [poofs, setPoofs] = useState([]);
  const [newTileId, setNewTileId] = useState(null);
  const [animating, setAnimating] = useState(false);

  // Store pre-move tiles for animation (includes tiles that will be poofed)
  const [preMoveTiles, setPreMoveTiles] = useState(tiles);
  
  // Store pending merges/poofs for phase 2
  const pendingMergesRef = useRef([]);
  const pendingPoofsRef = useRef([]);
  
  const handleMove = useCallback((direction) => {
    if (animating) return; // Prevent moves during animation
    
    const result = moveGrid(tiles, direction);
    if (result.changed) {
      setAnimating(true);
      
      // Store current tiles (including ones that will be poofed) for slide animation
      setPreMoveTiles([...tiles]);
      
      // Store merges/poofs for later (don't apply yet)
      pendingMergesRef.current = result.merges;
      pendingPoofsRef.current = result.poofs;
      
      setScore(prev => prev + result.scoreGained);
      setMovements(result.movements);
      // Don't set merges/poofs yet - wait for slide to complete
      setNewTileId(result.newTileId);
      
      // Wait for slide animation to complete
      setTimeout(() => {
        // Phase 2: Now apply merges and poofs
        setMerges(pendingMergesRef.current);
        setPoofs(pendingPoofsRef.current);
        
        // Apply new state (updates tile values and removes poofed tiles from logic)
        setTiles(result.newTiles);
        
        // After merge/poof animation completes
        setTimeout(() => {
          setPreMoveTiles(result.newTiles);
          setMerges([]);
          setPoofs([]);
          pendingMergesRef.current = [];
          pendingPoofsRef.current = [];
          setNewTileId(null);
          setAnimating(false);
        }, 200);
      }, 250);
    }
  }, [tiles, animating]);

  const handleReset = () => {
    const initial = createInitialState();
    setTiles(initial);
    setPreMoveTiles(initial);
    setScore(0);
    setMovements([]);
    setMerges([]);
    setPoofs([]);
    setNewTileId(null);
    setAnimating(false);
  };

  // Sync preMoveTiles with tiles when not animating
  useEffect(() => {
    if (!animating) {
      setPreMoveTiles(tiles);
    }
  }, [tiles, animating]);

  // Keyboard support for web/desktop
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const handleKeyDown = (e) => {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            handleMove('up');
            break;
          case 'ArrowDown':
            e.preventDefault();
            handleMove('down');
            break;
          case 'ArrowLeft':
            e.preventDefault();
            handleMove('left');
            break;
          case 'ArrowRight':
            e.preventDefault();
            handleMove('right');
            break;
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleMove]);

  // Swipe gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 30 || Math.abs(dy) > 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) < 30) return;

        if (absDx > absDy) {
          handleMove(dx > 0 ? 'right' : 'left');
        } else {
          handleMove(dy > 0 ? 'down' : 'up');
        }
      },
    })
  ).current;

  const isGameOver = !canMove(tiles);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.header}>
        <Text style={styles.title}>Color Mix 2048</Text>
        <Text style={styles.score}>Score: {score}</Text>
      </View>

      <View style={styles.gridContainer}>
        <Grid 
          tiles={animating ? preMoveTiles : tiles}
          movements={movements} 
          merges={merges}
          poofs={poofs}
          newTileId={newTileId} 
        />
      </View>

      <Text style={styles.instructions}>Swipe or use arrow keys to play</Text>

      <ColorGuide />

      {isGameOver && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverText}>Game Over</Text>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Restart</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  score: {
    fontSize: 20,
    color: '#aaa',
  },
  gridContainer: {
    marginBottom: 20,
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  gameOverText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 20,
  },
});
