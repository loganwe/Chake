# Chake

A browser-based snake duel game with optional AI opponent and a non-canvas overlay for turn and mode status.

## Overview

`Chake` combines classic snake movement with turn-based multiplayer and single-player AI modes. The game runs entirely in the browser using HTML, CSS, and JavaScript.

## Features

- Single-player mode with a red AI-controlled snake
- Multiplayer mode for two human players
- Turn-based gameplay for fair, strategic movement
- On-screen overlay showing current turn and mode outside the canvas
- Keyboard controls
- Restart and mode toggle support

## Files

- `index.html` - main game page and UI structure
- `style.css` - layout and overlay styles
- `main.js` - game loop, canvas rendering, and overlay updates
- `snake.js` - snake class, movement, and collision logic
- `playerMove.js` - player control handlers and keyboard shortcuts
- `compterMove.js` - improved AI move selection and game strategy
- `ai.js` - legacy neural network code (currently unused)
- `AI_IMPROVEMENTS.md` - technical notes on AI enhancements
- `QUICK_START.md` - fast testing and control guide

## Run locally

1. Clone or copy the repository files into a folder.
2. Open `index.html` in a web browser.
3. Play immediately — no build step is required.

## Controls

### Player 1 (Green Snake)
- Arrow keys: move up/down/left/right

### Player 2 (Red Snake)
- `W`, `A`, `S`, `D` keys (in multiplayer mode)

### Game actions
- `M` key or click the "Single Player" button: toggle AI mode
- `Restart` button or `Enter` after game over: restart the game

## Gameplay

- Moves alternate between players to keep play fair.
- The overlay displays the current turn and whether the game is in single-player or multiplayer mode.
- Win by trapping the opponent or forcing them to collide with a wall, their own body, or the enemy.

## Notes

- `compterMove.js` contains the current AI logic and strategy.
- `ai.js` is included as legacy/experimental code and is not required to run the game.
- For development, open the browser console to inspect logs and debugging output.

## Credits

Created as a lightweight browser game using vanilla JavaScript and HTML canvas.
