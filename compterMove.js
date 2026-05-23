
// Configuration - TRAP & BLOCK MODE
const BASE_DEPTH = 2000; // Reasonable thinking depth
const ALPHA_INIT = -Infinity;
const BETA_INIT = Infinity;
const VORONOI_WEIGHT = 0; // Focus on territory control
const TRAP_WEIGHT = 200; // MAXIMIZE trap rewards
const MOBILITY_WEIGHT = 20; // Less focus on own mobility
const CENTER_WEIGHT = 3; // Minimal center focus
const SAFETY_WEIGHT = 30; // Lower safety threshold - take risks to trap
const WALL_PENALTY_MULTIPLIER = 5; // Reduce wall avoidance for aggressive plays
const GOAL_WEIGHT = 0; // No goal reward
const BLOCK_WEIGHT = 150;  // MAXIMUM blocking reward

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

  
  const myHead = snake2.segments[0];
  const playerHead = snake1.segments[0];
  
  // Check if we're in danger (low mobility = survival mode)
  const myMobility = countAvailableMoves(myHead);
  const inDanger = myMobility <= 1; 
  
  // Check wall proximity
  const nearWall = myHead.x < snakeSize * 3 || myHead.x > canvas.width - snakeSize * 3 ||
                   myHead.y < snakeSize * 3 || myHead.y > canvas.height - snakeSize * 3;
  
  
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
  let chosenMove = findBestMoveAlphaBeta(myHead, depth, inDanger || nearWall);

  // If minimax failed, fall back to greedy safe move
  if (!chosenMove) {

    chosenMove = findGreediestSafeMove(myHead);
  }

  // If greedy also failed, try ANY move that doesn't immediately collide
  if (!chosenMove) {

    const allDirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 }
    ];
    const currentDirection = getCurrentDirection();
    for (let dir of allDirs) {
      if (currentDirection && isOppositeDirection(dir, currentDirection)) continue;
      const nx = myHead.x + dir.x * snakeSize;
      const ny = myHead.y + dir.y * snakeSize;
      if (!collidesWithWall(nx, ny) &&
          !collidesWithSnake(nx, ny, snake1) &&
          !willCollideWithSelf(nx, ny, snake2)) {
        chosenMove = dir;
        break;
      }
    }
  }

  // Only now — if truly no valid move exists — does the AI lose
  if (!chosenMove) {

    gameOver = true;
    winner = snake1.color;

    return;
  }

  const newX = myHead.x + chosenMove.x * snakeSize;
  const newY = myHead.y + chosenMove.y * snakeSize;
  console.log(`AI chose move: (${chosenMove.x}, ${chosenMove.y}) -> (${newX}, ${newY})`);

  const moveSuccessful = snake2.moveSnake(chosenMove, snake1);
  if (moveSuccessful) {
    currentTurn = 1;
    lastSnake.x = newX;
    lastSnake.y = newY;
    milInSpot = 0;
  } else {
    // chosenMove was rejected by moveSnake — try every other direction directly

    const allDirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 }
    ];
    const currentDirection = getCurrentDirection();
    let recovered = false;
    for (let dir of allDirs) {
      if (currentDirection && isOppositeDirection(dir, currentDirection)) continue;
      const nx = myHead.x + dir.x * snakeSize;
      const ny = myHead.y + dir.y * snakeSize;
      if (collidesWithWall(nx, ny)) continue;
      const result = snake2.moveSnake(dir, snake1);
      if (result) {
        currentTurn = 1;
        lastSnake.x = nx;
        lastSnake.y = ny;
        milInSpot = 0;
        recovered = true;

        break;
      }
    }
    if (!recovered) {

      gameOver = true;
      winner = snake1.color;
    }
  }


}

// 🚨 **Emergency Greedy Mode** - Defensive decision making
function findGreediestSafeMove(head) {
  const directions = [
    { x: 0, y: -1, name: 'up' },
    { x: 0, y: 1, name: 'down' },
    { x: -1, y: 0, name: 'left' },
    { x: 1, y: 0, name: 'right' }
  ];
  
  // Get current direction to avoid going backward
  const currentDirection = getCurrentDirection();
  const playerHead = snake1.segments[0];
  const playerNearWall = isNearWall(playerHead);
  
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
    
    // TRAP SCORING
    const newPos = { x: newX, y: newY };
    let score = 0;
    
    // PRIORITY 1: Trap opponent (limit mobility)
    const playerMobility = countAvailableMoves(playerHead);
    if (playerMobility <= 2) {
      score += 100 * (3 - playerMobility); // Big reward for trapping
    }
    
    // PRIORITY 2: Limit opponent space
    const playerReachable = reachableArea(playerHead);
    if (playerReachable < 40) {
      score += (40 - playerReachable) * 5; // Reward for containing
    }
    
    // PRIORITY 3: Block escape (be close)
    const distToOpponent = calculateDistance(newX, newY, playerHead);
    if (distToOpponent < snakeSize * 5) {
      score += 80; // Bonus for blocking position
    }
    score -= distToOpponent * 10; // Chase opponent
    
    // PRIORITY 4: Walls don't matter much
    const wallPenalty = playerNearWall 
      ? getWallProximityPenalty(newPos) * 0.5  // Minimal when chasing
      : getWallProximityPenalty(newPos) * 3;
    score -= wallPenalty;
    
    // PRIORITY 5: Own safety (secondary)
    const availableMoves = countAvailableMoves(newPos);
    score += availableMoves * 5; // Light weight on own flexibility
    

    
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

      continue;
    }
    
    const newX = head.x + move.x * snakeSize;
    const newY = head.y + move.y * snakeSize;
    
    if (!isSafe(newX, newY)) {

      continue;
    }
    
    // Double-check we're not hitting our own body (excluding segments that will move)
    if (willCollideWithSelf(newX, newY, snake2)) {

      continue;
    }
    
    // Simulate move
    const newPos = { x: newX, y: newY };
    const score = alphaBetaMin(newPos, maxDepth - 1, alpha, Math.max(alpha, bestScore), beta, true);
    

    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  

  
  // Emergency fallback: if no move found, pick any safe move (even if it has bad score)
  if (!bestMove) {

    for (let dir of directions) {
      const newX = head.x + dir.x * snakeSize;
      const newY = head.y + dir.y * snakeSize;
      
      // Just check basic safety, don't worry about score
      if (!collidesWithWall(newX, newY) && 
          !collidesWithSnake(newX, newY, snake1) &&
          !willCollideWithSelf(newX, newY, snake2)) {

        return dir;
      }
    }
  }
  
  return bestMove;
}

// 📊 **Move Ordering for Better Pruning**
function orderMoves(head, directions) {
  const playerHead = snake1.segments[0];
  const playerNearWall = isNearWall(playerHead);
  
  return directions.map(dir => {
    const newX = head.x + dir.x * snakeSize;
    const newY = head.y + dir.y * snakeSize;
    
    // Quick heuristic evaluation - trap focused
    let score = 0;
    if (isSafe(newX, newY)) {
      // Trap opponent
      const playerMobility = countAvailableMoves(playerHead);
      if (playerMobility <= 2) {
        score += 50 * (3 - playerMobility);
      }
      
      // Close distance
      score -= calculateDistance(newX, newY, playerHead) * 3;
      
      // Less weight on own safety
      score -= getWallProximityPenalty({ x: newX, y: newY }) * 0.5;
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

// 🎯 **Advanced Position Evaluation** - TRAP & BLOCK FOCUS
function evaluatePosition(position, isAI) {
  let score = 0;
  const myHead = position;
  const playerHead = snake1.segments[0];
  
  // TRAP PRIORITY #1: Limit opponent's mobility (trap reward)
  const playerMobility = countAvailableMoves(playerHead);
  if (playerMobility <= 2) {
    score += TRAP_WEIGHT * (3 - playerMobility); // Heavy reward if opponent is trapped
  }
  
  // TRAP PRIORITY #2: Control territory around opponent
  const playerReachable = reachableArea(playerHead);
  if (playerReachable < 30) {
    score += TRAP_WEIGHT * (30 - playerReachable) * 2; // Big reward for limiting opponent space
  }
  
  // TRAP PRIORITY #3: Block opponent's escape routes
  const distToOpponent = calculateDistance(myHead.x, myHead.y, playerHead);
  if (distToOpponent < snakeSize * 5) {
    score += BLOCK_WEIGHT; // Bonus for being close enough to block
  }
  
  // TRAP PRIORITY #4: Maintain own safety (secondary)
  const availableMoves = countAvailableMoves(myHead);
  score += availableMoves * MOBILITY_WEIGHT; // Some reward for own flexibility
  
  // TRAP PRIORITY #5: Avoid walls (but less stringent)
  const playerNearWall = isNearWall(playerHead);
  const wallPenalty = playerNearWall 
    ? getWallProximityPenalty(myHead) * SAFETY_WEIGHT * 0.1  // Minimal penalty if chasing
    : getWallProximityPenalty(myHead) * SAFETY_WEIGHT;       // Normal penalty otherwise
  score -= wallPenalty;
  
  // TRAP PRIORITY #6: Avoid articulation points ONLY if opponent has mobility
  if (playerMobility > 2 && isArticulationPoint(myHead)) {
    score -= 5000; // Reduced penalty - willing to take risks
  }
  
  // TRAP PRIORITY #7: Stay engaged and close
  const engagementWeight = playerNearWall ? 20 : 12; // Aggressive pursuit
  score -= distToOpponent * engagementWeight; // Chase opponent
  
  // Goal is ignored
  const distToGoal = Math.abs(myHead.y - lastRowY);
  score += (canvas.height - distToGoal) * GOAL_WEIGHT;

  return score;
}

// 🧱 Check if position is near a wall
function isNearWall(pos) {
  const margin = snakeSize * 3;
  return pos.x < margin || 
         pos.x > canvas.width - margin || 
         pos.y < margin || 
         pos.y > canvas.height - margin;
}

// 🧱 Side-wall penalty only (don't penalize proximity to goal rows)
function getSideWallProximityPenalty(pos) {
  let penalty = 0;
  const margin = snakeSize * 4;
  if (pos.x < margin) penalty += (margin - pos.x) * WALL_PENALTY_MULTIPLIER;
  if (pos.x > canvas.width - margin) penalty += (pos.x - (canvas.width - margin)) * WALL_PENALTY_MULTIPLIER;
  return penalty;
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
  const margin = snakeSize * 2;
  
  // Penalize Side Walls (X-axis)
  if (pos.x < margin) penalty += (margin - pos.x) * WALL_PENALTY_MULTIPLIER;
  if (pos.x > canvas.width - margin) penalty += (pos.x - (canvas.width - margin)) * WALL_PENALTY_MULTIPLIER;
  
  // Penalize Top Wall (where it started)
  if (pos.y < margin) penalty += (margin - pos.y) * WALL_PENALTY_MULTIPLIER;

  // NO PENALTY for the Bottom Wall (the Goal)
  // This allows the AI to actually touch the last row to win.
  
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
  return x < 0 || y < 0 || x + snakeSize > canvas.width || y + snakeSize > canvas.height;
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
