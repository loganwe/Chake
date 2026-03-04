const canvas = document.querySelector("canvas");
    const c = canvas.getContext("2d");
    canvas.width = 1024;
    canvas.height = 576;

    const snakeSize = 20;
    const maxLength = 49;
    let s1Direction = { x: 0, y: 0 };
    let s2Direction = { x: 0, y: 0 };
    let gameOver = false;
    let winner = null;
    const lastRowY = 548;
    const firstRowY = 8;
    let currentTurn = 1;
    let singlePlayer = false;
    let lastSnake = { x: 0, y: 0 };
    



    const snake1 = new Snake({
      position: { x: canvas.width / 2, y: lastRowY },
      color: "Green",
    });
    const snake2 = new Snake({
      position: { x: canvas.width / 2, y: firstRowY },
      color: "Red",
    });

    

    
   
  
  function check_win() {
    if (snake1.segments.every((segment) => segment.y === firstRowY)) {
      gameOver = true;
      winner = snake1.color;
    }
    if (snake2.segments.every((segment) => segment.y === lastRowY)) {
      gameOver = true;
      winner = snake2.color;
    }
  }
  

  setInterval(()=>{
    
    if (!gameOver) {
      c.clearRect(0, 0, canvas.width, canvas.height);
      if (currentTurn === 2 && singlePlayer) {
        computer();
      }
      snake1.draw();
      snake2.draw();
      check_win();
    } else {
      c.fillStyle = "white";
      c.font = "40px Arial";
      c.fillText(
        `${winner} Wins!`,
        canvas.width / 2 - 100,
        canvas.height / 2
      );
    }
    },100)