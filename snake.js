
class Snake {
    constructor({ position, color }) {
      this.position = position;
      this.size = snakeSize;
      this.segments = [];
      this.color = color;
      this.segments.push({ x: this.position.x, y: this.position.y });
    }

    draw() {
      this.segments.forEach((segment, index) => {
        if (index === 0) {
          // Head: brighter/distinct color
          c.fillStyle = "white";
        } else {
          c.fillStyle = this.color;
        }
        c.fillRect(segment.x, segment.y, this.size, this.size);
      });
    }

    moveSnake(direction, opponentSnake) {
      if (gameOver) return;

      const nextHeadX = this.segments[0].x + direction.x * this.size;
      const nextHeadY = this.segments[0].y + direction.y * this.size;

      if (
        nextHeadX >= 0 &&
        nextHeadX + this.size < canvas.width &&
        nextHeadY >= 0 &&
        nextHeadY + this.size < canvas.height
        && this.segments
      ) {
        // Check for collision with opponent snake
        if (
          opponentSnake.segments.some(
            (segment) => nextHeadX === segment.x && nextHeadY === segment.y
          )
        ) {
          gameOver = true;
          winner = opponentSnake.color;
          return false;
        }

        if (
          this.segments.some(
            (segment) => nextHeadX === segment.x && nextHeadY === segment.y
          )
        ) {
          gameOver = true;
          winner = opponentSnake.color;
          return false;
        }

        const oldTail = this.segments[this.segments.length - 1];
        for (let i = this.segments.length - 1; i > 0; i--) {
          this.segments[i] = { ...this.segments[i - 1] };
        }

        this.segments[0].x = nextHeadX;
        this.segments[0].y = nextHeadY;

        if (this.segments.length < maxLength) {
          this.segments.push({ ...oldTail });
        }
        return true;
      } else {
        return false;
      }
    }
  }

  function handleMoveSnake(player, direction) {
    let moveSuccessful;
      // Prevent moving directly backward into themselves
      function isOppositeDirection(dir1, dir2) {
        return dir1.x === -dir2.x && dir1.y === -dir2.y;
      }
      if (player === 1) {
        // Get current direction for snake1
        let currentDirection = { x: 0, y: 0 };
        if (snake1.segments.length > 1) {
          currentDirection.x = snake1.segments[0].x - snake1.segments[1].x;
          currentDirection.y = snake1.segments[0].y - snake1.segments[1].y;
          // Normalize direction
          if (currentDirection.x !== 0) currentDirection.x = currentDirection.x / Math.abs(currentDirection.x);
          if (currentDirection.y !== 0) currentDirection.y = currentDirection.y / Math.abs(currentDirection.y);
        }
        if (isOppositeDirection(direction, currentDirection)) {
          // Ignore move if it's directly backward
          return;
        }
        moveSuccessful = snake1.moveSnake(direction, snake2);
        if (moveSuccessful) {
          // Track stalemate: reset if moved toward goal (firstRowY), else increment
          if (snake1.segments[0].y < lastPSnake.y) {
            milInSpotP = 0;
          } else {
            milInSpotP++;
          }
          lastPSnake.x = snake1.segments[0].x;
          lastPSnake.y = snake1.segments[0].y;
          currentTurn = 2;
        }
      } else if (player === 2) {
        let currentDirection = { x: 0, y: 0 };
        if (snake2.segments.length > 1) {
          currentDirection.x = snake2.segments[0].x - snake2.segments[1].x;
          currentDirection.y = snake2.segments[0].y - snake2.segments[1].y;
          if (currentDirection.x !== 0) currentDirection.x = currentDirection.x / Math.abs(currentDirection.x);
          if (currentDirection.y !== 0) currentDirection.y = currentDirection.y / Math.abs(currentDirection.y);
        }
        if (isOppositeDirection(direction, currentDirection)) {
          return;
        }
        moveSuccessful = snake2.moveSnake(direction, snake1);
        if (moveSuccessful) {
          currentTurn = 1;
          // Track stalemate: reset if moved toward goal (lastRowY), else increment
          if (snake2.segments[0].y > lastSnake.y) {
            milInSpot = 0;
          } else {
            milInSpot++;
          }
          lastSnake.x = snake2.segments[0].x;
          lastSnake.y = snake2.segments[0].y;
        }
      }
  }