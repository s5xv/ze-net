import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function MiningGame() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [score, setScore] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      initGame();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, gameOver]);

  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 600;

    let playerY = canvas.height - 100;
    let playerX = canvas.width / 2 - 20;
    let fallingBlocks = [];
    let frameCount = 0;

    const gameLoop = () => {
      ctx.fillStyle = isDark ? '#09090b' : '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw player (pickaxe)
      ctx.fillStyle = '#f97316';
      ctx.fillRect(playerX, playerY, 40, 40);

      // Spawn blocks
      frameCount++;
      if (frameCount % 60 === 0) {
        fallingBlocks.push({
          x: Math.random() * (canvas.width - 40),
          y: -40,
          type: Math.random() > 0.7 ? 'diamond' : 'stone'
        });
      }

      // Update and draw blocks
      fallingBlocks.forEach((block, index) => {
        block.y += 3;

        // Draw block
        if (block.type === 'diamond') {
          ctx.fillStyle = '#06b6d4';
        } else {
          ctx.fillStyle = '#737373';
        }
        ctx.fillRect(block.x, block.y, 40, 40);

        // Check collision
        if (
          block.y + 40 > playerY &&
          block.y < playerY + 40 &&
          block.x + 40 > playerX &&
          block.x < playerX + 40
        ) {
          setScore(prev => prev + (block.type === 'diamond' ? 10 : 1));
          fallingBlocks.splice(index, 1);
        }

        // Remove if off screen
        if (block.y > canvas.height) {
          fallingBlocks.splice(index, 1);
        }
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Keyboard controls
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' && playerX > 0) {
        playerX -= 20;
      }
      if (e.key === 'ArrowRight' && playerX < canvas.width - 40) {
        playerX += 20;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  };

  const startGame = () => {
    setScore(0);
    setGameStarted(true);
    setGameOver(false);
  };

  const endGame = () => {
    setGameOver(true);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        <a href="/" className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">HOME</a>
        <button onClick={toggleTheme} className="text-xs sm:text-sm font-mono font-medium text-neutral-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors tracking-wide">{isDark ? 'LIGHT' : 'DARK'}</button>
      </div>

      <main className="flex-grow flex flex-col items-center justify-center px-4 py-8">
        <h1 className="text-4xl font-bold mb-4">Mining Game</h1>
        <p className="text-neutral-500 mb-6">Use arrow keys to move. Catch blocks to score!</p>

        <div className="mb-4 text-2xl font-bold">Score: {score}</div>

        {!gameStarted || gameOver ? (
          <button
            onClick={startGame}
            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            {gameOver ? 'Play Again' : 'Start Game'}
          </button>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="border-4 border-orange-500 rounded-lg"
            />
            <button
              onClick={endGame}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              End Game
            </button>
          </>
        )}

        <p className="text-sm text-neutral-500 mt-6">
          Stone = 1 point | Diamond = 10 points
        </p>
      </main>
    </div>
  );
}
