import { BIT_VALUES } from '../constants/colors';

const GRID_SIZE = 4;
let idCounter = 1;

// Tile structure: { id, value, row, col }
// Create empty tiles array
export function createEmptyTiles() {
  return [];
}

// Get tile at position
function getTileAt(tiles, row, col) {
  return tiles.find(t => t.row === row && t.col === col);
}

// Remove tile at position
function removeTileAt(tiles, row, col) {
  return tiles.filter(t => !(t.row === row && t.col === col));
}

// Spawn random base color (R, G, or B)
function spawnRandomBlock(tiles) {
  const emptyCells = [];
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!getTileAt(tiles, row, col)) {
        emptyCells.push({ row, col });
      }
    }
  }

  if (emptyCells.length === 0) return { tiles, newTileId: null };

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const baseColors = [BIT_VALUES.RED, BIT_VALUES.GREEN, BIT_VALUES.BLUE];
  const randomColor = baseColors[Math.floor(Math.random() * baseColors.length)];

  const newTile = {
    id: idCounter++,
    value: randomColor,
    row: randomCell.row,
    col: randomCell.col,
  };
  
  return { tiles: [...tiles, newTile], newTileId: newTile.id };
}

// Check if two blocks can merge (no common bits)
function canMerge(a, b) {
  if (!a || !b) return false;
  return (a & b) === 0;
}

// Merge two blocks
function merge(a, b) {
  return a | b;
}

// Create initial game state with 2 random blocks
export function createInitialState() {
  let result = { tiles: createEmptyTiles(), newTileId: null };
  result = spawnRandomBlock(result.tiles);
  result = spawnRandomBlock(result.tiles);
  return result.tiles;
}

// Convert tiles to grid format (for backward compatibility)
export function tilesToGrid(tiles) {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  tiles.forEach(tile => {
    if (tile.row >= 0 && tile.row < GRID_SIZE && tile.col >= 0 && tile.col < GRID_SIZE) {
      grid[tile.row][tile.col] = tile.value;
    }
  });
  return grid;
}

// Track tile movements and merges
// movements: [{tileId, from: {r,c}, to: {r,c}}] - slide animations
// merges: [{sourceId, targetId, newValue}] - merge operations after slide
// poofs: [{tileId}] - tiles that disappear after merge

// Move and merge logic for a single line with tile tracking
function processLineWithTiles(tiles, lineIndices, direction) {
  // lineIndices: array of {r, c} for this line in processing order
  // Get tiles in this line in order
  let lineTiles = lineIndices.map(({r, c}) => getTileAt(tiles, r, c)).filter(Boolean);
  
  let score = 0;
  let whites = [];
  let movements = [];
  let merges = [];
  let poofs = [];
  
  // First pass: identify merges and update values
  for (let i = 0; i < lineTiles.length - 1; i++) {
    const current = lineTiles[i];
    const next = lineTiles[i + 1];
    
    if (current && next && canMerge(current.value, next.value)) {
      const mergedValue = merge(current.value, next.value);
      
      // Record merge for post-slide animation
      merges.push({
        sourceId: next.id,  // This tile will disappear
        targetId: current.id,  // This tile will get the new value
        newValue: mergedValue
      });
      
      // Update current tile value
      current.value = mergedValue;
      
      // Check if white (7) was formed BEFORE modifying index
      if (mergedValue === 7) {
        score += 100;
        whites.push(i);
      }
      
      // Mark next tile for removal after slide
      poofs.push({ tileId: next.id });
      
      // Remove from lineTiles for position calculation
      lineTiles.splice(i + 1, 1);
      i--; // Check if merged tile can merge with next
    }
  }
  
  // Handle white blocks (poof after appearing briefly)
  for (let i = whites.length - 1; i >= 0; i--) {
    const whiteTile = lineTiles[whites[i]];
    if (whiteTile) {
      poofs.push({ tileId: whiteTile.id, delay: true }); // Delayed poof
      lineTiles.splice(whites[i], 1);
      score += 50;
    }
  }
  
  // Calculate final positions
  const compactedPositions = lineIndices.slice(0, lineTiles.length);
  
  // Record slide movements for remaining tiles
  // Also track where merged tiles should slide to
  const finalPositions = {}; // tileId -> {row, col}
  
  lineTiles.forEach((tile, index) => {
    const newPos = compactedPositions[index];
    finalPositions[tile.id] = { row: newPos.r, col: newPos.c };
    
    if (tile.row !== newPos.r || tile.col !== newPos.c) {
      movements.push({
        tileId: tile.id,
        from: { row: tile.row, col: tile.col },
        to: { row: newPos.r, col: newPos.c }
      });
    }
    // Update tile position
    tile.row = newPos.r;
    tile.col = newPos.c;
  });
  
  // Record slide movements for tiles that will merge (they slide to target's final position)
  merges.forEach(merge => {
    const targetFinal = finalPositions[merge.targetId];
    if (targetFinal) {
      movements.push({
        tileId: merge.sourceId,
        from: { row: tiles.find(t => t.id === merge.sourceId)?.row || 0, col: tiles.find(t => t.id === merge.sourceId)?.col || 0 },
        to: targetFinal
      });
    }
  });
  
  // Remove poofed tiles from tiles array
  let newTiles = tiles.filter(t => !poofs.some(p => p.tileId === t.id));
  
  return { tiles: newTiles, movements, merges, poofs, score };
}

// Move grid in specified direction
// Returns: { newTiles, changed, scoreGained, movements, merges, poofs, newTileId }
export function moveGrid(tiles, direction) {
  let allMovements = [];
  let allMerges = [];
  let allPoofs = [];
  let allScore = 0;
  let newTiles = [...tiles];

  if (direction === 'left') {
    for (let row = 0; row < GRID_SIZE; row++) {
      const lineIndices = [{r: row, c: 0}, {r: row, c: 1}, {r: row, c: 2}, {r: row, c: 3}];
      const result = processLineWithTiles(newTiles, lineIndices, 'forward');
      newTiles = result.tiles;
      allMovements.push(...result.movements);
      allMerges.push(...result.merges);
      allPoofs.push(...result.poofs);
      allScore += result.score;
    }
  } else if (direction === 'right') {
    for (let row = 0; row < GRID_SIZE; row++) {
      const lineIndices = [{r: row, c: 3}, {r: row, c: 2}, {r: row, c: 1}, {r: row, c: 0}];
      const result = processLineWithTiles(newTiles, lineIndices, 'forward');
      newTiles = result.tiles;
      allMovements.push(...result.movements);
      allMerges.push(...result.merges);
      allPoofs.push(...result.poofs);
      allScore += result.score;
    }
  } else if (direction === 'up') {
    for (let col = 0; col < GRID_SIZE; col++) {
      const lineIndices = [{r: 0, c: col}, {r: 1, c: col}, {r: 2, c: col}, {r: 3, c: col}];
      const result = processLineWithTiles(newTiles, lineIndices, 'forward');
      newTiles = result.tiles;
      allMovements.push(...result.movements);
      allMerges.push(...result.merges);
      allPoofs.push(...result.poofs);
      allScore += result.score;
    }
  } else if (direction === 'down') {
    for (let col = 0; col < GRID_SIZE; col++) {
      const lineIndices = [{r: 3, c: col}, {r: 2, c: col}, {r: 1, c: col}, {r: 0, c: col}];
      const result = processLineWithTiles(newTiles, lineIndices, 'forward');
      newTiles = result.tiles;
      allMovements.push(...result.movements);
      allMerges.push(...result.merges);
      allPoofs.push(...result.poofs);
      allScore += result.score;
    }
  }

  // Check if anything moved
  const changed = allMovements.length > 0;

  // Spawn new block if changed
  let newTileId = null;
  if (changed) {
    const spawnResult = spawnRandomBlock(newTiles);
    newTiles = spawnResult.tiles;
    newTileId = spawnResult.newTileId;
  }

  return { newTiles, changed, scoreGained: allScore, movements: allMovements, merges: allMerges, poofs: allPoofs, newTileId };
}

// Check if any move is possible
export function canMove(tiles) {
  // Check for empty cells
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!getTileAt(tiles, row, col)) return true;
    }
  }

  // Check for possible merges
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const current = getTileAt(tiles, row, col);
      if (!current) continue;
      
      // Check right neighbor
      const right = getTileAt(tiles, row, col + 1);
      if (right && canMerge(current.value, right.value)) return true;
      
      // Check bottom neighbor
      const bottom = getTileAt(tiles, row + 1, col);
      if (bottom && canMerge(current.value, bottom.value)) return true;
    }
  }

  return false;
}
