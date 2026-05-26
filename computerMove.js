// ========================================
// COMPUTER MOVE - MAIN AI LOGIC
// ========================================
// Depends on: computerMoveUtils.js, computerMoveSearch.js

function move() {
  clearCaches();

  const myHead = snake2.segments[0];
  const playerHead = snake1.segments[0];

  const myMobility = countAvailableMoves(myHead);
  const inDanger = myMobility <= 1;

  const nearWall = myHead.x < snakeSize * 3 || myHead.x > canvas.width - snakeSize * 3 ||
                   myHead.y < snakeSize * 3 || myHead.y > canvas.height - snakeSize * 3;

  const availableSpace = countEmptyCells();
  let depth = BASE_DEPTH;

  if (inDanger || nearWall) {
    depth = 1;
  } else if (availableSpace > 200) {
    depth = BASE_DEPTH;
  } else {
    depth = BASE_DEPTH + 1;
  }

  console.log(`AI thinking with depth ${depth}, available space: ${availableSpace}, mobility: ${myMobility}`);

  let chosenMove = findBestMoveAlphaBeta(myHead, depth, inDanger || nearWall);
  if (!chosenMove) {
    chosenMove = findGreediestSafeMove(myHead);
  }

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

function findGreediestSafeMove(head) {
  const directions = [
    { x: 0, y: -1, name: 'up' },
    { x: 0, y: 1, name: 'down' },
    { x: -1, y: 0, name: 'left' },
    { x: 1, y: 0, name: 'right' }
  ];

  const currentDirection = getCurrentDirection();
  const playerHead = snake1.segments[0];
  const playerNearWall = isNearWall(playerHead);

  let bestMove = null;
  let bestScore = -Infinity;

  for (let dir of directions) {
    if (currentDirection && isOppositeDirection(dir, currentDirection)) continue;

    const newX = head.x + dir.x * snakeSize;
    const newY = head.y + dir.y * snakeSize;

    if (collidesWithWall(newX, newY)) continue;
    if (collidesWithSnake(newX, newY, snake1)) continue;
    if (willCollideWithSelf(newX, newY, snake2)) continue;

    const newPos = { x: newX, y: newY };
    let score = 0;

    const playerMobility = countAvailableMoves(playerHead);
    if (playerMobility <= 2) {
      score += 100 * (3 - playerMobility);
    }

    const playerReachable = reachableArea(playerHead);
    if (playerReachable < 40) {
      score += (40 - playerReachable) * 5;
    }

    const distToOpponent = calculateDistance(newX, newY, playerHead);
    if (distToOpponent < snakeSize * 5) {
      score += 80;
    }
    score -= distToOpponent * 10;

    const wallPenalty = playerNearWall
      ? getWallProximityPenalty(newPos) * 0.5
      : getWallProximityPenalty(newPos) * 3;
    score -= wallPenalty;

    const availableMoves = countAvailableMoves(newPos);
    score += availableMoves * 5;

    if (score > bestScore) {
      bestScore = score;
      bestMove = dir;
    }
  }

  return bestMove;
}

function computer() {
  if (gameOver || currentTurn !== 2 || !singlePlayer) return;
  move();
}
