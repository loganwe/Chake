// ========================================
// COMPUTER MOVE SEARCH & EVALUATION
// ========================================

function findBestMoveAlphaBeta(head, maxDepth, inDanger = false) {
  const directions = [
    { x: 0, y: -1, name: 'up' },
    { x: 0, y: 1, name: 'down' },
    { x: -1, y: 0, name: 'left' },
    { x: 1, y: 0, name: 'right' }
  ];

  const currentDirection = getCurrentDirection();

  let bestMove = null;
  let bestScore = ALPHA_INIT;
  const alpha = ALPHA_INIT;
  const beta = BETA_INIT;

  const orderedMoves = orderMoves(head, directions);

  for (let moveData of orderedMoves) {
    const move = moveData.dir;

    if (currentDirection && isOppositeDirection(move, currentDirection)) {
      continue;
    }

    const newX = head.x + move.x * snakeSize;
    const newY = head.y + move.y * snakeSize;

    if (!isSafe(newX, newY)) {
      continue;
    }

    if (willCollideWithSelf(newX, newY, snake2)) {
      continue;
    }

    const newPos = { x: newX, y: newY };
    const score = alphaBetaMin(newPos, maxDepth - 1, alpha, Math.max(alpha, bestScore), beta, true);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  if (!bestMove) {
    for (let dir of directions) {
      const newX = head.x + dir.x * snakeSize;
      const newY = head.y + dir.y * snakeSize;
      if (!collidesWithWall(newX, newY) &&
          !collidesWithSnake(newX, newY, snake1) &&
          !willCollideWithSelf(newX, newY, snake2)) {
        return dir;
      }
    }
  }

  return bestMove;
}

function orderMoves(head, directions) {
  const playerHead = snake1.segments[0];
  const playerNearWall = isNearWall(playerHead);

  return directions.map(dir => {
    const newX = head.x + dir.x * snakeSize;
    const newY = head.y + dir.y * snakeSize;

    let score = 0;
    if (isSafe(newX, newY)) {
      const playerMobility = countAvailableMoves(playerHead);
      if (playerMobility <= 2) {
        score += 50 * (3 - playerMobility);
      }
      score -= calculateDistance(newX, newY, playerHead) * 3;
      score -= getWallProximityPenalty({ x: newX, y: newY }) * 0.5;
    }

    return { dir, score };
  }).sort((a, b) => b.score - a.score);
}

function alphaBetaMax(position, depth, alpha, beta, isAI) {
  const posKey = getPositionKey(position, depth, true);
  if (transpositionTable.has(posKey)) {
    return transpositionTable.get(posKey);
  }

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
    if (beta <= alpha) break;
  }

  transpositionTable.set(posKey, maxScore);
  return maxScore;
}

function alphaBetaMin(position, depth, alpha, beta, isAI) {
  const posKey = getPositionKey(position, depth, false);
  if (transpositionTable.has(posKey)) {
    return transpositionTable.get(posKey);
  }

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
    if (beta <= alpha) break;
  }

  transpositionTable.set(posKey, minScore);
  return minScore;
}

function evaluatePosition(position, isAI) {
  let score = 0;
  const myHead = position;
  const playerHead = snake1.segments[0];

  const playerMobility = countAvailableMoves(playerHead);
  if (playerMobility <= 2) {
    score += TRAP_WEIGHT * (3 - playerMobility);
  }

  const playerReachable = reachableArea(playerHead);
  if (playerReachable < 30) {
    score += TRAP_WEIGHT * (30 - playerReachable) * 2;
  }

  const distToOpponent = calculateDistance(myHead.x, myHead.y, playerHead);
  if (distToOpponent < snakeSize * 5) {
    score += 1 * TRAP_WEIGHT;
  }

  const availableMoves = countAvailableMoves(myHead);
  score += availableMoves * MOBILITY_WEIGHT;

  const playerNearWall = isNearWall(playerHead);
  const wallPenalty = playerNearWall
    ? getWallProximityPenalty(myHead) * SAFETY_WEIGHT * 0.1
    : getWallProximityPenalty(myHead) * SAFETY_WEIGHT;
  score -= wallPenalty;

  if (playerMobility > 2 && isArticulationPoint(myHead)) {
    score -= 5000;
  }

  const engagementWeight = playerNearWall ? 20 : 12;
  score -= distToOpponent * engagementWeight;

  const distToGoal = Math.abs(myHead.y - lastRowY);
  score += (canvas.height - distToGoal) * GOAL_WEIGHT;

  return score;
}

function calculateVoronoiTerritory(pos1, pos2) {
  const cacheKey = `${pos1.x},${pos1.y}-${pos2.x},${pos2.y}`;
  if (voronoiCache.has(cacheKey)) {
    return voronoiCache.get(cacheKey);
  }

  let myTerritory = 0;
  let oppTerritory = 0;
  let neutral = 0;

  const queue1 = [{ pos: pos1, dist: 0 }];
  const queue2 = [{ pos: pos2, dist: 0 }];
  const visited1 = new Set([`${pos1.x},${pos1.y}`]);
  const visited2 = new Set([`${pos2.x},${pos2.y}`]);
  const distances1 = new Map();
  const distances2 = new Map();

  while (queue1.length > 0) {
    const { pos, dist } = queue1.shift();
    const key = `${pos.x},${pos.y}`;
    distances1.set(key, dist);
    for (let next of getNeighbors(pos)) {
      const nextKey = `${next.x},${next.y}`;
      if (!visited1.has(nextKey) && isSafe(next.x, next.y)) {
        visited1.add(nextKey);
        queue1.push({ pos: next, dist: dist + 1 });
      }
    }
  }

  while (queue2.length > 0) {
    const { pos, dist } = queue2.shift();
    const key = `${pos.x},${pos.y}`;
    distances2.set(key, dist);
    for (let next of getNeighbors(pos)) {
      const nextKey = `${next.x},${next.y}`;
      if (!visited2.has(nextKey) && isSafe(next.x, next.y)) {
        visited2.add(nextKey);
        queue2.push({ pos: next, dist: dist + 1 });
      }
    }
  }

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

function canTrapOpponent(myPos, oppPos) {
  const oppReach = reachableArea(oppPos);
  const myReach = reachableArea(myPos);
  const oppMoves = countAvailableMoves(oppPos);
  return oppReach < myReach * 0.3 || (oppMoves <= 1 && oppReach < 20);
}

function isArticulationPoint(pos) {
  const neighbors = getNeighbors(pos);
  let safeNeighbors = 0;
  for (let n of neighbors) {
    if (isSafe(n.x, n.y)) {
      safeNeighbors++;
    }
  }
  return safeNeighbors <= 1;
}
