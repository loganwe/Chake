// 🚀 **AI Movement with Detailed Game Over Check**
const maxDepth = 1; // Increased depth for better decision making, but can be adjusted for performance
function move() {
  // Clear safety cache because snake positions change each turn
  safetyCache.clear();
  logGameState();
  const playerHead = snake1.segments[0];
  const myHead = snake2.segments[0];

  // Check distance between AI and player
  let distanceToPlayer = calculateDistance(myHead.x, myHead.y, playerHead);

  let bestMove;

  // If player is far, chase
  if (distanceToPlayer > 10 * snakeSize) {
    bestMove = findBestMoveByDistance(myHead, playerHead);
  } else {
    // If player is close, use minimax and flood fill
    bestMove = findBestMove(myHead, maxDepth);
  }

  if (bestMove) {
    let newX = myHead.x + bestMove.x;
    let newY = myHead.y + bestMove.y;
  
    let moveSuccessful = snake2.moveSnake(bestMove, snake1);
  
    if (moveSuccessful) {
      currentTurn = 1;
      lastSnake.x = newX;
      lastSnake.y = newY;
      milInSpot = 0;
    } else {
      console.log("AI move failed. Verifying actual collision...");
      if (collidesWithSnake(newX, newY, snake1) || collidesWithSnake(newX, newY, snake2, true)) {
        console.log("AI actually collided with a snake!");
        gameOver = true;
        winner = snake1.color;
      } else {
        console.log("AI move failed, but no actual collision detected.");
      }
    }
  } else {
    console.log("AI found no valid moves. Automatically loses.");
    gameOver = true;
    winner = snake1.color;
  }
  logGameState();
}

// 🧠 **AI Decision Making (Smart Move Selection)**
function computer() {
  if (gameOver || currentTurn !== 2 || !singlePlayer) return;
  console.log(`AI Head Position: (${snake2.segments[0].x}, ${snake2.segments[0].y})`);
  move();
}

// 🛡️ **Collision Check Logic**
function collidesWithSnake(x, y, snake, ignoreHead = false) {
  return snake.segments.some((segment, index) => {
    if (ignoreHead && index === 0) return false;
    return segment.x === x && segment.y === y;
  });
}

// 📏 **Distance Calculation**
function calculateDistance(x1, y1, head) {
  return Math.sqrt(Math.pow(x1 - head.x, 2) + Math.pow(y1 - head.y, 2));
}

// 📊 **Log AI and Player State for Debugging**
function logGameState() {
  console.log("AI Head Position: ", snake2.segments[0]);
  console.log("Player Head Position: ", snake1.segments[0]);
  console.log("Current Turn: ", currentTurn);
  console.log("Game Over: ", gameOver);
  console.log("Winner: ", winner);
}

// 🏃 **Chasing Player When Far**
function findBestMoveByDistance(myHead, playerHead) {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  let bestMove = null;
  let shortestDistance = Infinity;
  let bestFutureSafeMoves = -1;

  for (let dir in directions) {
    const nextX = myHead.x + directions[dir].x * snakeSize;
    const nextY = myHead.y + directions[dir].y * snakeSize;

    if (isSafe(nextX, nextY)) {
      let distance = calculateDistance(nextX, nextY, playerHead);
      // Use reachable area (flood-fill) as a stronger safety metric
      let futureReach = reachableArea({ x: nextX, y: nextY });
      if ((distance < shortestDistance && futureReach > 0) ||
          (distance === shortestDistance && futureReach > bestFutureSafeMoves)) {
        shortestDistance = distance;
        bestFutureSafeMoves = futureReach;
        bestMove = directions[dir];
      }
    }
  }
  if (bestMove) console.log("Best Move: ", bestMove);
  return bestMove;
}



// 🛡️ **Collision & Safety Checks**
let safetyCache = new Map();

function isSafe(x, y) {
  let key = `${x},${y}`;
  if (safetyCache.has(key)) return safetyCache.get(key);

  let safe = !collidesWithWall(x, y) && 
             !collidesWithSnake(x, y, snake1) && 
             !collidesWithSnake(x, y, snake2, true);

  safetyCache.set(key, safe);
  return safe;
}

function collidesWithWall(x, y) {
  return x < 0 || y < 0 || x >= canvas.width || y >= canvas.height;
}

// 🚀 **Count Available Moves**
function countAvailableMoves(head) {
  let moves = 0;
  ["up", "down", "left", "right"].forEach(dir => {
    let newX = head.x + (dir === "left" ? -snakeSize : dir === "right" ? snakeSize : 0);
    let newY = head.y + (dir === "up" ? -snakeSize : dir === "down" ? snakeSize : 0);
    if (isSafe(newX, newY)) moves++;
  });
  return moves;
}
function findBestMove(head, depth) {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  let bestMove = null;
  let bestScore = -Infinity;
  let rightScore = 0;
  let leftScore = 0;
  let upScore = 0;
  let downScore = 0;

  const bodySet = new Set(snake2.segments.map(s => `${s.x},${s.y}`));

  for (let dir in directions) {
    const move = directions[dir];
    const newX = head.x + move.x*snakeSize;
    const newY = head.y + move.y*snakeSize;

    if (!isSafe(newX, newY)) continue;

    const score = evaluateMove({ x: newX, y: newY }, depth - 1, new Set(bodySet));
    console.log(`Move ${dir} => Score: ${score}`);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    } else if (score === bestScore && bestMove) {
      // Tie-breaker: prefer the move that leaves more available space,
      // then prefer continuing current direction, then pick randomly.
      const candidatePos = { x: newX, y: newY };
      const currentBestPos = { x: head.x + bestMove.x, y: head.y + bestMove.y };
      const pickCandidate = tieBreakPrefer(candidatePos, currentBestPos, move, bestMove, head);
      if (pickCandidate) bestMove = move;
    }
  }
  
  return bestMove;
}

// Tie-breaker helper: prefer more available moves, then current direction, then random move
function tieBreakPrefer(posA, posB, moveA, moveB, head) {
  const availA = countAvailableMoves(posA);
  const availB = countAvailableMoves(posB);
  // Use reachable area (flood-fill) rather than immediate neighbor count
  const reachA = reachableArea(posA);
  const reachB = reachableArea(posB);
  if (reachA >= reachB) return true;
  if (reachA < reachB) return false;

  const currentDir = getCurrentDirection();
  if (currentDir) {
    if (directionEquals(moveA, currentDir) && !directionEquals(moveB, currentDir)) return true;
    if (!directionEquals(moveA, currentDir) && directionEquals(moveB, currentDir)) return false;
  }

  return Math.random() < 0.5;
}

function getCurrentDirection() {
  if (!snake2 || !snake2.segments || snake2.segments.length < 2) return null;
  const head = snake2.segments[0];
  const neck = snake2.segments[1];
  const dx = head.x - neck.x;
  const dy = head.y - neck.y;
  // Normalize to snakeSize steps
  return { x: Math.sign(dx) * snakeSize, y: Math.sign(dy) * snakeSize };
}

function directionEquals(a, b) {
  return a.x === b.x && a.y === b.y;
}

// Flood-fill to count reachable empty cells from a position (grid steps of snakeSize)
function reachableArea(start) {
  const cols = Math.floor(canvas.width / snakeSize);
  const rows = Math.floor(canvas.height / snakeSize);
  const startKey = `${start.x},${start.y}`;
  let visited = new Set();
  let queue = [start];
  visited.add(startKey);
  let count = 0;

  while (queue.length) {
    const { x, y } = queue.shift();
    count++;

    const neighbors = [
      { x: x - snakeSize, y },
      { x: x + snakeSize, y },
      { x, y: y - snakeSize },
      { x, y: y + snakeSize }
    ];

    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;
      // quick bounds check
      if (n.x < 0 || n.y < 0 || n.x >= canvas.width || n.y >= canvas.height) continue;
      if (!isSafe(n.x, n.y)) continue;
      visited.add(key);
      queue.push(n);
    }
  }

  return count;
}

function evaluateMove(position, depth, bodySet) {
  const key = `${position.x},${position.y}`;
  if (!isSafe(position.x, position.y) || bodySet.has(key)) return -1000; // dead or cycle

  // Clone body and simulate new head
  const newBodySet = new Set(bodySet);
  newBodySet.add(key);

  if (newBodySet.size > snake2.segments.length) {
    // Simulate tail moving
    const tail = Array.from(newBodySet)[0]; // oldest added
    newBodySet.delete(tail);
  }

  if (depth <= 0) {
    return countAvailableMoves(position); // fast heuristic
  }

  let maxScore = -1000;
  const directions = [
    { x: 0, y: -snakeSize },
    { x: 0, y: snakeSize },
    { x: -snakeSize, y: 0 },
    { x: snakeSize, y: 0 }
  ];

  for (let move of directions) {
    const nextX = position.x + move.x;
    const nextY = position.y + move.y;
    const score = evaluateMove({ x: nextX, y: nextY }, depth - 1, new Set(newBodySet));
    if (score > maxScore) maxScore = score;
  }

  return maxScore;
}
