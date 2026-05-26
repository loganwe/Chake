// ========================================
// COMPUTER MOVE UTILITIES
// ========================================

const transpositionTable = new Map();
const voronoiCache = new Map();
const reachableCache = new Map();
const safetyCache = new Map();

const BASE_DEPTH = 3;
const ALPHA_INIT = -Infinity;
const BETA_INIT = Infinity;
const TRAP_WEIGHT = 120;
const MOBILITY_WEIGHT = 5;
const SAFETY_WEIGHT = 2;
const GOAL_WEIGHT = 1;
const WALL_PENALTY_MULTIPLIER = 1;

function clearCaches() {
  transpositionTable.clear();
  voronoiCache.clear();
  reachableCache.clear();
  safetyCache.clear();
}

function isNearWall(pos) {
  const margin = snakeSize * 3;
  return pos.x < margin ||
         pos.x > canvas.width - margin ||
         pos.y < margin ||
         pos.y > canvas.height - margin;
}

function getSideWallProximityPenalty(pos) {
  let penalty = 0;
  const margin = snakeSize * 4;
  if (pos.x < margin) penalty += (margin - pos.x) * WALL_PENALTY_MULTIPLIER;
  if (pos.x > canvas.width - margin) penalty += (pos.x - (canvas.width - margin)) * WALL_PENALTY_MULTIPLIER;
  return penalty;
}

function getNeighbors(pos) {
  return [
    { x: pos.x - snakeSize, y: pos.y },
    { x: pos.x + snakeSize, y: pos.y },
    { x: pos.x, y: pos.y - snakeSize },
    { x: pos.x, y: pos.y + snakeSize }
  ];
}

function getCurrentDirection() {
  if (!snake2 || !snake2.segments || snake2.segments.length < 2) return null;
  const head = snake2.segments[0];
  const neck = snake2.segments[1];
  const dx = head.x - neck.x;
  const dy = head.y - neck.y;
  return {
    x: dx === 0 ? 0 : Math.sign(dx),
    y: dy === 0 ? 0 : Math.sign(dy)
  };
}

function isOppositeDirection(dir1, dir2) {
  return dir1.x === -dir2.x && dir1.y === -dir2.y;
}

function willCollideWithSelf(x, y, snake) {
  for (let i = 0; i < snake.segments.length - 1; i++) {
    if (snake.segments[i].x === x && snake.segments[i].y === y) {
      return true;
    }
  }
  return false;
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

  if (pos.x < margin) penalty += (margin - pos.x) * WALL_PENALTY_MULTIPLIER;
  if (pos.x > canvas.width - margin) penalty += (pos.x - (canvas.width - margin)) * WALL_PENALTY_MULTIPLIER;
  if (pos.y < margin) penalty += (margin - pos.y) * WALL_PENALTY_MULTIPLIER;

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

  const visited = new Set();
  const queue = [start];
  visited.add(cacheKey);
  let count = 0;

  while (queue.length > 0) {
    const pos = queue.shift();
    count++;

    for (let next of getNeighbors(pos)) {
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
  for (let next of getNeighbors(head)) {
    if (isSafe(next.x, next.y)) moves++;
  }
  return moves;
}

function isSafe(x, y) {
  const key = `${x},${y}`;
  if (safetyCache.has(key)) return safetyCache.get(key);

  if (collidesWithWall(x, y)) {
    safetyCache.set(key, false);
    return false;
  }

  if (collidesWithSnake(x, y, snake1)) {
    safetyCache.set(key, false);
    return false;
  }

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
