// 🚀 **Enhanced AI with Advanced Strategic Analysis**

// Configuration - ULTRA DEFENSIVE MODE
const BASE_DEPTH = 2; // Even simpler decisions
const ALPHA_INIT = -Infinity;
const BETA_INIT = Infinity;
const VORONOI_WEIGHT = 20; // Minimal territory focus
const TRAP_WEIGHT = 50; // Don't be aggressive
const MOBILITY_WEIGHT = 100; // MAXIMIZE having options
const CENTER_WEIGHT = 5; // Minimal center focus
const SAFETY_WEIGHT = 150; // MAXIMUM safety focus
const WALL_PENALTY_MULTIPLIER = 10; // Stay far from walls

// Caching for performance
let safetyCache = new Map();
let voronoiCache = new Map();
let reachableCache = new Map();
let transpositionTable = new Map();

// Clear all caches at the start of each move
function clearCaches() {
  safetyCache.clear();
  voronoiCache.clear();
  reachableCache.clear();
  // Don't clear transposition table - keep it across moves for learning
}

// 🎯 **Main AI Entry Point**
function move() {
  clearCaches();
  logGameState();
  
  const myHead = snake2.segments[0];
  const playerHead = snake1.segments[0];
  
  // Check if we're in danger (low mobility = survival mode)
  const myMobility = countAvailableMoves(myHead);
  const inDanger = myMobility <= 3; // Increased threshold
  
  // Check wall proximity
  const nearWall = myHead.x < snakeSize * 3 || myHead.x > canvas.width - snakeSize * 3 ||
                   myHead.y < snakeSize * 3 || myHead.y > canvas.height - snakeSize * 3;
  
  if (inDanger) {
    console.log("⚠️ SURVIVAL MODE ACTIVATED - Low mobility detected!");
  }
  
  if (nearWall) {
    console.log("⚠️ WARNING - Near wall!");
  }
  
  // Adaptive depth based on game complexity and danger
  const availableSpace = countEmptyCells();
  let depth = BASE_DEPTH;
  
  // If in danger or near wall, use shallow depth for quick decisions
  if (inDanger || nearWall) {
    depth = 1; // Simplest possible - just pick safest immediate move
  } else if (availableSpace > 200) {
    depth = BASE_DEPTH;
  } else {
    depth = BASE_DEPTH + 1;
  }
  
  console.log(`AI thinking with depth ${depth}, available space: ${availableSpace}, mobility: ${myMobility}`);
  
  // Use alpha-beta minimax for best move
  const bestMove = findBestMoveAlphaBeta(myHead, depth, inDanger || nearWall);
  
  // If still no move and we're in extreme danger, use ultra-simple greedy approach
  if (!bestMove && (inDanger || nearWall)) {
    console.log("⚠️⚠️ EXTREME DANGER - Using greedy fallback!");
    const greedyMove = findGreediestSafeMove(myHead);
    if (greedyMove) {
      console.log("Found greedy safe move:", greedyMove);
      const newX = myHead.x + greedyMove.x * snakeSize;
      const newY = myHead.y + greedyMove.y * snakeSize;
      
      const moveSuccessful = snake2.moveSnake(greedyMove, snake1);
      if (moveSuccessful) {
        currentTurn = 1;
        lastSnake.x = newX;
        lastSnake.y = newY;
        milInSpot = 0;
        logGameState();
        return;
      }
    }
  }
  
  if (bestMove) {
    const newX = myHead.x + bestMove.x * snakeSize;
    const newY = myHead.y + bestMove.y * snakeSize;
    
    console.log(`AI chose move: direction (${bestMove.x}, ${bestMove.y}) -> position (${newX}, ${newY})`);
    
    // FINAL SAFETY CHECK before executing
    if (collidesWithWall(newX, newY)) {
      console.log("❌ CRITICAL: Move would hit wall! Aborting.");
      gameOver = true;
      winner = snake1.color;
      return;
    }
    
    if (collidesWithSnake(newX, newY, snake1)) {
      console.log("❌ CRITICAL: Move would hit opponent! Aborting.");
      gameOver = true;
      winner = snake1.color;
      return;
    }
    
    if (willCollideWithSelf(newX, newY, snake2)) {
      console.log("❌ CRITICAL: Move would hit self! Aborting.");
      gameOver = true;
      winner = snake1.color;
      return;
    }
    
    const moveSuccessful = snake2.moveSnake(bestMove, snake1);
    
    if (moveSuccessful) {
      currentTurn = 1;
      lastSnake.x = newX;
      lastSnake.y = newY;
      milInSpot = 0;
    } else {
      console.log("❌ AI move failed!");
      gameOver = true;
      winner = snake1.color;
    }
  } else {
    console.log("❌ AI found no valid moves. Game over.");
    gameOver = true;
    winner = snake1.color;
  }
  
  logGameState();
}

// 🚨 **Emergency Greedy Mode** - Simplest possible decision making
function findGreediestSafeMove(head) {
  const directions = [
    { x: 0, y: -1, name: 'up' },
    { x: 0, y: 1, name: 'down' },
    { x: -1, y: 0, name: 'left' },
    { x: 1, y: 0, name: 'right' }
  ];
  
  // Get current direction to avoid going backward
  const currentDirection = getCurrentDirection();
  
  let bestMove = null;
  let bestScore = -Infinity;
  
  for (let dir of directions) {
    // Skip backward moves
    if (currentDirection && isOppositeDirection(dir, currentDirection)) {
      continue;
    }
    
    const newX = head.x + dir.x * snakeSize;
    const newY = head.y + dir.y * snakeSize;
    
    // Basic safety checks
    if (collidesWithWall(newX, newY)) continue;
    if (collidesWithSnake(newX, newY, snake1)) continue;
    if (willCollideWithSelf(newX, newY, snake2)) continue;
    
    // Simple scoring: reachable area + distance from walls
    const newPos = { x: newX, y: newY };
    let score = 0;
    
    score += reachableArea(newPos) * 10; // More space = better
    score += countAvailableMoves(newPos) * 20; // More options = better
    score -= getWallProximityPenalty(newPos); // Far from walls = better
    
    // Prefer moving toward center
    const centerDist = getDistanceToCenter(newX, newY);
    score -= centerDist * 0.1;
    
    console.log(`Greedy ${dir.name}: score ${score.toFixed(2)}`);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = dir;
    }
  }
  
  return bestMove;
}

// 🧠 **Computer Move Handler**
function computer() {
  if (gameOver || currentTurn !== 2 || !singlePlayer) return;
  move();
}

// 🎲 **Alpha-Beta Minimax with Transposition Table**
function findBestMoveAlphaBeta(head, maxDepth, inDanger = false) {
  const directions = [
    { x: 0, y: -1, name: 'up' },
    { x: 0, y: 1, name: 'down' },
    { x: -1, y: 0, name: 'left' },
    { x: 1, y: 0, name: 'right' }
  ];
  
  // Get current direction to prevent backward moves
  const currentDirection = getCurrentDirection();
  
  let bestMove = null;
  let bestScore = ALPHA_INIT;
  const alpha = ALPHA_INIT;
  const beta = BETA_INIT;
  
  // Order moves by heuristic quality (best first for better pruning)
  const orderedMoves = orderMoves(head, directions);
  
  for (let moveData of orderedMoves) {
    const move = moveData.dir;
    
    // CRITICAL: Prevent moving backward into own body
    if (currentDirection && isOppositeDirection(move, currentDirection)) {
      console.log(`Skipping ${moveData.dir.name} - would move backward into body`);
      continue;
    }
    
    const newX = head.x + move.x * snakeSize;
    const newY = head.y + move.y * snakeSize;
    
    if (!isSafe(newX, newY)) {
      console.log(`Skipping ${moveData.dir.name} - position unsafe`);
      continue;
    }
    
    // Double-check we're not hitting our own body (excluding segments that will move)
    if (willCollideWithSelf(newX, newY, snake2)) {
      console.log(`Skipping ${moveData.dir.name} - would collide with own body`);
      continue;
    }
    
    // Simulate move
    const newPos = { x: newX, y: newY };
    const score = alphaBetaMin(newPos, maxDepth - 1, alpha, Math.max(alpha, bestScore), beta, true);
    
    console.log(`Move ${move.name}: Score ${score.toFixed(2)}`);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  console.log(`Best move selected with score: ${bestScore.toFixed(2)}`);
  
  // Emergency fallback: if no move found, pick any safe move (even if it has bad score)
  if (!bestMove) {
    console.log("No good move found! Trying emergency fallback...");
    for (let dir of directions) {
      const newX = head.x + dir.x * snakeSize;
      const newY = head.y + dir.y * snakeSize;
      
      // Just check basic safety, don't worry about score
      if (!collidesWithWall(newX, newY) && 
          !collidesWithSnake(newX, newY, snake1) &&
          !willCollideWithSelf(newX, newY, snake2)) {
        console.log(`Emergency move: ${dir.name}`);
        return dir;
      }
    }
  }
  
  return bestMove;
}

// 📊 **Move Ordering for Better Pruning**
function orderMoves(head, directions) {
  return directions.map(dir => {
    const newX = head.x + dir.x * snakeSize;
    const newY = head.y + dir.y * snakeSize;
    
    // Quick heuristic evaluation
    let score = 0;
    if (isSafe(newX, newY)) {
      score += countAvailableMoves({ x: newX, y: newY }) * 10;
      score += getDistanceToCenter(newX, newY);
      score -= calculateDistance(newX, newY, snake1.segments[0]) * 0.1;
    }
    
    return { dir, score };
  }).sort((a, b) => b.score - a.score);
}

// ⬆️ **Alpha-Beta Max (AI's turn)**
function alphaBetaMax(position, depth, alpha, beta, isAI) {
  // Check transposition table
  const posKey = getPositionKey(position, depth, true);
  if (transpositionTable.has(posKey)) {
    return transpositionTable.get(posKey);
  }
  
  // Terminal conditions
  if (depth <= 0 || !isSafe(position.x, position.y)) {
    const score = evaluatePosition(position, isAI);
    transpositionTable.set(posKey, score);
    return score;
  }
  
  let maxScore = ALPHA_INIT;
  const directions = [
    { x: 0, y: -snakeSize },
    { x: 0, y: snakeSize },
    { x: -snakeSize, y: 0 },
    { x: snakeSize, y: 0 }
  ];
  
  for (let move of directions) {
    const newX = position.x + move.x;
    const newY = position.y + move.y;
    
    if (!isSafe(newX, newY)) continue;
    
    const score = alphaBetaMin({ x: newX, y: newY }, depth - 1, alpha, beta, !isAI);
    maxScore = Math.max(maxScore, score);
    alpha = Math.max(alpha, score);
    
    if (beta <= alpha) break; // Beta cutoff
  }
  
  transpositionTable.set(posKey, maxScore);
  return maxScore;
}

// ⬇️ **Alpha-Beta Min (Player's turn)**
function alphaBetaMin(position, depth, alpha, beta, isAI) {
  // Check transposition table
  const posKey = getPositionKey(position, depth, false);
  if (transpositionTable.has(posKey)) {
    return transpositionTable.get(posKey);
  }
  
  // Terminal conditions
  if (depth <= 0 || !isSafe(position.x, position.y)) {
    const score = evaluatePosition(position, isAI);
    transpositionTable.set(posKey, score);
    return score;
  }
  
  let minScore = BETA_INIT;
  const directions = [
    { x: 0, y: -snakeSize },
    { x: 0, y: snakeSize },
    { x: -snakeSize, y: 0 },
    { x: snakeSize, y: 0 }
  ];
  
  for (let move of directions) {
    const newX = position.x + move.x;
    const newY = position.y + move.y;
    
    if (!isSafe(newX, newY)) continue;
    
    const score = alphaBetaMax({ x: newX, y: newY }, depth - 1, alpha, beta, !isAI);
    minScore = Math.min(minScore, score);
    beta = Math.min(beta, score);
    
    if (beta <= alpha) break; // Alpha cutoff
  }
  
  transpositionTable.set(posKey, minScore);
  return minScore;
}

// 🎯 **Advanced Position Evaluation**
function evaluatePosition(position, isAI) {
  const myHead = isAI ? position : snake2.segments[0];
  const oppHead = isAI ? snake1.segments[0] : position;
  
  // If position is unsafe, heavily penalize
  if (!isSafe(position.x, position.y)) {
    return isAI ? -10000 : 10000;
  }
  
  let score = 0;
  
  // Calculate key metrics
  const myReach = reachableArea(myHead);
  const oppReach = reachableArea(oppHead);
  const myMobility = countAvailableMoves(myHead);
  const oppMobility = countAvailableMoves(oppHead);
  
  // Survival mode: if low mobility, prioritize safety above all else
  const inSurvivalMode = myMobility <= 3 || myReach < 50; // Increased thresholds
  
  if (inSurvivalMode) {
    // SURVIVAL MODE: Safety is everything!
    score += myReach * 300; // MASSIVE boost to reachable area
    score += myMobility * 150; // HUGE boost to mobility
    score -= getWallProximityPenalty(myHead) * WALL_PENALTY_MULTIPLIER; // Avoid walls even more
    
    // Still avoid opponent but don't worry about territory
    const distance = calculateDistance(myHead.x, myHead.y, oppHead);
    if (distance < snakeSize * 5) {
      score -= 200; // Get FAR away from opponent when trapped
    }
    
    return score;
  }
  
  // NORMAL MODE: Balanced strategy
  
  // 1. Voronoi Territory Control (most important in late game)
  const voronoi = calculateVoronoiTerritory(myHead, oppHead);
  score += voronoi.myTerritory * VORONOI_WEIGHT;
  score -= voronoi.oppTerritory * VORONOI_WEIGHT;
  
  // 2. Reachable Area (immediate safety)
  score += myReach * SAFETY_WEIGHT;
  score -= oppReach * SAFETY_WEIGHT * 0.5; // Less weight on opponent reach
  
  // 3. Mobility (available moves)
  score += myMobility * MOBILITY_WEIGHT;
  score -= oppMobility * MOBILITY_WEIGHT * 0.7;
  
  // 4. Trap Detection (can we trap opponent?)
  if (canTrapOpponent(myHead, oppHead)) {
    score += TRAP_WEIGHT;
  }
  if (canTrapOpponent(oppHead, myHead)) {
    score -= TRAP_WEIGHT * 1.5; // Being trapped is worse
  }
  
  // 5. Center Control (especially early game)
  const centerDist = getDistanceToCenter(myHead.x, myHead.y);
  const oppCenterDist = getDistanceToCenter(oppHead.x, oppHead.y);
  score += (canvas.width / 2 - centerDist) * CENTER_WEIGHT;
  score -= (canvas.width / 2 - oppCenterDist) * CENTER_WEIGHT * 0.5;
  
  // 6. Distance Management (not too close, not too far)
  const distance = calculateDistance(myHead.x, myHead.y, oppHead);
  const optimalDist = snakeSize * 8;
  const distPenalty = Math.abs(distance - optimalDist) * 0.5;
  score -= distPenalty;
  
  // 7. Wall Avoidance
  score -= getWallProximityPenalty(myHead);
  
  // 8. Articulation Points (critical positions)
  if (isArticulationPoint(myHead)) {
    score -= 50; // Avoid positions that could trap us
  }
  
  return score;
}

// 🗺️ **Voronoi Territory Calculation**
function calculateVoronoiTerritory(pos1, pos2) {
  const cacheKey = `${pos1.x},${pos1.y}-${pos2.x},${pos2.y}`;
  if (voronoiCache.has(cacheKey)) {
    return voronoiCache.get(cacheKey);
  }
  
  let myTerritory = 0;
  let oppTerritory = 0;
  let neutral = 0;
  
  const cols = Math.floor(canvas.width / snakeSize);
  const rows = Math.floor(canvas.height / snakeSize);
  
  // Use BFS from both positions simultaneously
  const queue1 = [{ pos: pos1, dist: 0 }];
  const queue2 = [{ pos: pos2, dist: 0 }];
  const visited1 = new Set([`${pos1.x},${pos1.y}`]);
  const visited2 = new Set([`${pos2.x},${pos2.y}`]);
  const distances1 = new Map();
  const distances2 = new Map();
  
  // BFS for AI snake
  while (queue1.length > 0) {
    const { pos, dist } = queue1.shift();
    const key = `${pos.x},${pos.y}`;
    distances1.set(key, dist);
    
    const neighbors = getNeighbors(pos);
    for (let next of neighbors) {
      const nextKey = `${next.x},${next.y}`;
      if (!visited1.has(nextKey) && isSafe(next.x, next.y)) {
        visited1.add(nextKey);
        queue1.push({ pos: next, dist: dist + 1 });
      }
    }
  }
  
  // BFS for player snake
  while (queue2.length > 0) {
    const { pos, dist } = queue2.shift();
    const key = `${pos.x},${pos.y}`;
    distances2.set(key, dist);
    
    const neighbors = getNeighbors(pos);
    for (let next of neighbors) {
      const nextKey = `${next.x},${next.y}`;
      if (!visited2.has(nextKey) && isSafe(next.x, next.y)) {
        visited2.add(nextKey);
        queue2.push({ pos: next, dist: dist + 1 });
      }
    }
  }
  
  // Count territory based on distances
  for (let x = 0; x < canvas.width; x += snakeSize) {
    for (let y = 0; y < canvas.height; y += snakeSize) {
      const key = `${x},${y}`;
      if (!isSafe(x, y)) continue;
      
      const dist1 = distances1.get(key) || Infinity;
      const dist2 = distances2.get(key) || Infinity;
      
      if (dist1 < dist2) myTerritory++;
      else if (dist2 < dist1) oppTerritory++;
      else neutral++;
    }
  }
  
  const result = { myTerritory, oppTerritory, neutral };
  voronoiCache.set(cacheKey, result);
  return result;
}

// 🪤 **Trap Detection**
function canTrapOpponent(myPos, oppPos) {
  // Check if opponent's reachable area is significantly smaller than ours
  const oppReach = reachableArea(oppPos);
  const myReach = reachableArea(myPos);
  
  // Also check if opponent has limited escape routes
  const oppMoves = countAvailableMoves(oppPos);
  
  return oppReach < myReach * 0.3 || (oppMoves <= 1 && oppReach < 20);
}

// 🎯 **Articulation Point Detection**
function isArticulationPoint(pos) {
  // Simplified: A position is risky if it's in a narrow corridor
  // Check if we have limited escape routes
  const neighbors = getNeighbors(pos);
  let safeNeighbors = 0;
  
  for (let n of neighbors) {
    if (isSafe(n.x, n.y)) {
      safeNeighbors++;
    }
  }
  
  // If only one escape route, it's a risky articulation point
  return safeNeighbors <= 1;
}

// 🧮 **Utility Functions**

function getCurrentDirection() {
  if (!snake2 || !snake2.segments || snake2.segments.length < 2) return null;
  const head = snake2.segments[0];
  const neck = snake2.segments[1];
  const dx = head.x - neck.x;
  const dy = head.y - neck.y;
  // Normalize to unit direction
  return { 
    x: dx === 0 ? 0 : Math.sign(dx), 
    y: dy === 0 ? 0 : Math.sign(dy) 
  };
}

function isOppositeDirection(dir1, dir2) {
  // Check if dir1 is exactly opposite to dir2
  return (dir1.x === -dir2.x && dir1.y === -dir2.y);
}

function willCollideWithSelf(x, y, snake) {
  // Check collision with body, but account for tail moving
  // The tail will move away, so we can ignore the last segment
  for (let i = 0; i < snake.segments.length - 1; i++) {
    if (snake.segments[i].x === x && snake.segments[i].y === y) {
      return true;
    }
  }
  return false;
}

function getNeighbors(pos) {
  return [
    { x: pos.x - snakeSize, y: pos.y },
    { x: pos.x + snakeSize, y: pos.y },
    { x: pos.x, y: pos.y - snakeSize },
    { x: pos.x, y: pos.y + snakeSize }
  ];
}

function getPositionKey(pos, depth, isMax) {
  return `${pos.x},${pos.y},${depth},${isMax}`;
}

function getDistanceToCenter(x, y) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
}

function getWallProximityPenalty(pos) {
  let penalty = 0;
  const margin = snakeSize * 4; // Increased from 2 - stay FAR from walls
  
  if (pos.x < margin) penalty += (margin - pos.x) * WALL_PENALTY_MULTIPLIER;
  if (pos.x > canvas.width - margin) penalty += (pos.x - (canvas.width - margin)) * WALL_PENALTY_MULTIPLIER;
  if (pos.y < margin) penalty += (margin - pos.y) * WALL_PENALTY_MULTIPLIER;
  if (pos.y > canvas.height - margin) penalty += (pos.y - (canvas.height - margin)) * WALL_PENALTY_MULTIPLIER;
  
  return penalty;
}

function countEmptyCells() {
  let count = 0;
  for (let x = 0; x < canvas.width; x += snakeSize) {
    for (let y = 0; y < canvas.height; y += snakeSize) {
      if (isSafe(x, y)) count++;
    }
  }
  return count;
}

function reachableArea(start) {
  const cacheKey = `${start.x},${start.y}`;
  if (reachableCache.has(cacheKey)) {
    return reachableCache.get(cacheKey);
  }
  
  let visited = new Set();
  let queue = [start];
  visited.add(cacheKey);
  let count = 0;
  
  while (queue.length > 0) {
    const pos = queue.shift();
    count++;
    
    const neighbors = getNeighbors(pos);
    for (let next of neighbors) {
      const key = `${next.x},${next.y}`;
      if (!visited.has(key) && isSafe(next.x, next.y)) {
        visited.add(key);
        queue.push(next);
      }
    }
  }
  
  reachableCache.set(cacheKey, count);
  return count;
}

function countAvailableMoves(head) {
  let moves = 0;
  const neighbors = getNeighbors(head);
  for (let next of neighbors) {
    if (isSafe(next.x, next.y)) moves++;
  }
  return moves;
}

function isSafe(x, y) {
  const key = `${x},${y}`;
  if (safetyCache.has(key)) return safetyCache.get(key);
  
  // Check walls
  if (collidesWithWall(x, y)) {
    safetyCache.set(key, false);
    return false;
  }
  
  // Check player snake (all segments)
  if (collidesWithSnake(x, y, snake1)) {
    safetyCache.set(key, false);
    return false;
  }
  
  // Check own body (excluding head and tail since tail will move)
  // This is more accurate for planning future moves
  if (snake2.segments.length > 2) {
    for (let i = 1; i < snake2.segments.length - 1; i++) {
      if (snake2.segments[i].x === x && snake2.segments[i].y === y) {
        safetyCache.set(key, false);
        return false;
      }
    }
  }
  
  safetyCache.set(key, true);
  return true;
}

function collidesWithWall(x, y) {
  return x < 0 || y < 0 || x >= canvas.width || y >= canvas.height;
}

function collidesWithSnake(x, y, snake, ignoreHead = false) {
  return snake.segments.some((segment, index) => {
    if (ignoreHead && index === 0) return false;
    return segment.x === x && segment.y === y;
  });
}

function calculateDistance(x1, y1, head) {
  return Math.sqrt(Math.pow(x1 - head.x, 2) + Math.pow(y1 - head.y, 2));
}

function logGameState() {
  console.log("=".repeat(50));
  console.log("AI Head:", snake2.segments[0]);
  console.log("AI Body Length:", snake2.segments.length);
  if (snake2.segments.length > 1) {
    console.log("AI Neck:", snake2.segments[1]);
  }
  console.log("Player Head:", snake1.segments[0]);
  console.log("Player Body Length:", snake1.segments.length);
  console.log("Current Turn:", currentTurn);
  console.log("Game Over:", gameOver);
  if (winner) console.log("Winner:", winner);
  console.log("=".repeat(50));
}