
document
.getElementById("s1-up")
.addEventListener("click", () => handleMoveSnake(1, { x: 0, y: -1 }));
document
.getElementById("s1-down")
.addEventListener("click", () => handleMoveSnake(1, { x: 0, y: 1 }));
document
.getElementById("s1-left")
.addEventListener("click", () => handleMoveSnake(1, { x: -1, y: 0 }));
document
.getElementById("s1-right")
.addEventListener("click", () => handleMoveSnake(1, { x: 1, y: 0 }));

document
.getElementById("s2-up")
.addEventListener("click", () => handleMoveSnake(2, { x: 0, y: -1 }));
document
.getElementById("s2-down")
.addEventListener("click", () => handleMoveSnake(2, { x: 0, y: 1 }));
document
.getElementById("s2-left")
.addEventListener("click", () => handleMoveSnake(2, { x: -1, y: 0 }));
document
.getElementById("s2-right")
.addEventListener("click", () => handleMoveSnake(2, { x: 1, y: 0 }));

document.getElementById("restart-btn").addEventListener("click", () => {
if (gameOver) window.location.reload();
});

document.addEventListener("keydown", (event) => {
if (!gameOver) {
  switch (event.key) {
    case "ArrowUp":
      if (currentTurn === 1) handleMoveSnake(1, { x: 0, y: -1 });
      break;
    case "ArrowLeft":
      if (currentTurn === 1) handleMoveSnake(1, { x: -1, y: 0 });
      break;
    case "ArrowDown":
      if (currentTurn === 1) handleMoveSnake(1, { x: 0, y: 1 });
      break;
    case "ArrowRight":
      if (currentTurn === 1) handleMoveSnake(1, { x: 1, y: 0 });
      break;
    case "w":
      if (currentTurn === 2) handleMoveSnake(2, { x: 0, y: -1 });
      break;
    case "a":
      if (currentTurn === 2) handleMoveSnake(2, { x: -1, y: 0 });
      break;
    case "s":
      if (currentTurn === 2) handleMoveSnake(2, { x: 0, y: 1 });
      break;
    case "d":
      if (currentTurn === 2) handleMoveSnake(2, { x: 1, y: 0 });
      break;
    case "m":
      if (!gameOver) singlePlayer = !singlePlayer;
      break;
    case "p":
      // alert("Predicted Moves [X, Y]:" + outputLayerOutput.slice(0, 5));
      alert("Rounded Predictions [X, Y]:" + roundOutput(outputLayerOutput.slice(0, 1)));

  }
} else {
  if (event.key == "Enter") window.location.reload();
}
});
