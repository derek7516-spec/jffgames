// Matter.js module aliases
const { Engine, Render, Runner, World, Bodies, Body, Events, Mouse, MouseConstraint } = Matter;

// Game constants
// Biggest fruit radius is 76, diameter = 152
// Container width = 3 × 152 = 456 (approximately 450 for round number)
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 500;
const WALL_THICKNESS = 15;
const DANGER_LINE = 120; // Danger line position (lower value = higher up)

// Fruit sizes (radius) for levels 1-9
// Biggest fruit should be about 1/3 of container width
// Container = 300, so biggest = ~100 diameter = 50 radius
// Hitbox matches the actual visible fruit content (no transparent background)
const FRUIT_SIZE_MULTIPLIER = 2.0; // Adjust this to scale all fruits (1.0 = normal, 1.5 = 50% bigger, 2.0 = double size)
const BASE_FRUIT_SIZES = [12, 16, 20, 24, 29, 34, 40, 45, 50];
const FRUIT_SIZES = BASE_FRUIT_SIZES.map(size => size * FRUIT_SIZE_MULTIPLIER);
// PNG images are 64x64, but actual fruit content is smaller due to transparent edges
// If your fruit takes up ~90% of the PNG, adjust this value
const IMAGE_CONTENT_RATIO = 0.90; // 90% of image is actual fruit, 10% is transparent

// Fruit colors for levels 1-9
const FRUIT_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#52BE80'
];

// Game state
let engine, render, runner, world;
let score = 0;
let nextFruitLevel = 1;
let currentFruit = null;
let canDrop = true;
let gameOver = false;
let fruits = [];
let images = {};
let dangerLineTimer = 0; // Timer for game over condition

// Preload fruit images
function preloadImages() {
    for (let i = 1; i <= 9; i++) {
        const img = new Image();
        img.src = `img/${i}.png`;
        images[i] = img;
    }
}

// Initialize game
function initGame() {
    // Reset game state
    score = 0;
    nextFruitLevel = Math.floor(Math.random() * 3) + 1; // Start with level 1-3
    currentFruit = null;
    canDrop = true;
    gameOver = false;
    fruits = [];
    dangerLineTimer = 0;
    
    updateScore();
    updateNextFruit();
    document.getElementById('game-over').classList.add('hidden');
    
    // Create engine
    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 1;
    
    // Create renderer
    const canvas = document.getElementById('gameCanvas');
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            wireframes: false,
            background: '#fef9e7'
        }
    });
    
    Render.run(render);
    
    // Create runner
    runner = Runner.create();
    Runner.run(runner, engine);
    
    // Create walls and floor
    const ground = Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + 30, CANVAS_WIDTH, 60, {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
    });
    
    const leftWall = Bodies.rectangle(-10, CANVAS_HEIGHT / 2, WALL_THICKNESS, CANVAS_HEIGHT, {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
    });
    
    const rightWall = Bodies.rectangle(CANVAS_WIDTH + 10, CANVAS_HEIGHT / 2, WALL_THICKNESS, CANVAS_HEIGHT, {
        isStatic: true,
        render: { fillStyle: '#8B4513' }
    });
    
    // Danger line (visual only)
    const dangerLine = Bodies.rectangle(CANVAS_WIDTH / 2, DANGER_LINE, CANVAS_WIDTH, 2, {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: '#e74c3c', opacity: 0.5 }
    });
    
    World.add(world, [ground, leftWall, rightWall, dangerLine]);
    
    // Mouse control for dropping fruits
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    
    // Collision detection for merging
    Events.on(engine, 'collisionStart', handleCollision);
    
    // Check game over condition
    Events.on(engine, 'afterUpdate', checkGameOverCondition);
    
    // Create first fruit
    createNextFruit();
}

function createNextFruit() {
    if (gameOver) return;
    
    const targetRadius = FRUIT_SIZES[nextFruitLevel - 1];
    const x = CANVAS_WIDTH / 2;
    const y = 50;
    
    // PNG images are 64x64 pixels, but have transparent padding
    // We want sprite to display at targetRadius size
    const imageSize = 64;
    const scale = (targetRadius * 2) / imageSize;
    
    // Physics radius matches the actual fruit content (excluding transparent edges)
    const physicsRadius = targetRadius * IMAGE_CONTENT_RATIO;
    
    currentFruit = Bodies.circle(x, y, physicsRadius, {
        restitution: 0.3,
        friction: 0.5,
        density: 0.001,
        isStatic: true,
        render: {
            sprite: {
                texture: `img/${nextFruitLevel}.png`,
                xScale: scale,
                yScale: scale
            }
        }
    });
    
    currentFruit.fruitLevel = nextFruitLevel;
    currentFruit.isFruit = true;
    currentFruit.targetRadius = targetRadius; // Store for boundary checks
    
    World.add(world, currentFruit);
}

function handleMouseMove(event) {
    if (!currentFruit || !canDrop || gameOver) return;
    
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    
    // Keep fruit within bounds using target radius (visual boundary)
    const targetRadius = currentFruit.targetRadius;
    const minX = targetRadius + WALL_THICKNESS;
    const maxX = CANVAS_WIDTH - targetRadius - WALL_THICKNESS;
    const clampedX = Math.max(minX, Math.min(maxX, mouseX));
    
    Body.setPosition(currentFruit, { x: clampedX, y: 50 });
}

function handleClick() {
    if (!currentFruit || !canDrop || gameOver) return;
    
    // Drop the fruit
    Body.setStatic(currentFruit, false);
    canDrop = false;
    
    // Wait for fruit to settle before allowing next drop
    setTimeout(() => {
        currentFruit = null;
        nextFruitLevel = Math.floor(Math.random() * 3) + 1; // Random level 1-3
        updateNextFruit();
        
        setTimeout(() => {
            canDrop = true;
            createNextFruit();
        }, 500);
    }, 300);
}

function handleCollision(event) {
    const pairs = event.pairs;
    
    for (let pair of pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        // Check if both are fruits and same level
        if (bodyA.isFruit && bodyB.isFruit && 
            bodyA.fruitLevel === bodyB.fruitLevel &&
            bodyA.fruitLevel < 9) {
            
            // Merge fruits
            const level = bodyA.fruitLevel;
            const newLevel = level + 1;
            
            // Calculate position for new fruit (average of both)
            const x = (bodyA.position.x + bodyB.position.x) / 2;
            const y = (bodyA.position.y + bodyB.position.y) / 2;
            
            // Remove old fruits
            World.remove(world, bodyA);
            World.remove(world, bodyB);
            
            // Create new merged fruit
            const targetRadius = FRUIT_SIZES[newLevel - 1];
            
            // Calculate proper sprite scale (PNG images are 64x64)
            const imageSize = 64;
            const scale = (targetRadius * 2) / imageSize;
            
            // Physics radius matches actual fruit content (no transparent background)
            const physicsRadius = targetRadius * IMAGE_CONTENT_RATIO;
            
            const newFruit = Bodies.circle(x, y, physicsRadius, {
                restitution: 0.3,
                friction: 0.5,
                density: 0.001,
                render: {
                    sprite: {
                        texture: `img/${newLevel}.png`,
                        xScale: scale,
                        yScale: scale
                    }
                }
            });
            
            newFruit.fruitLevel = newLevel;
            newFruit.isFruit = true;
            newFruit.targetRadius = targetRadius;
            
            World.add(world, newFruit);
            
            // Update score
            score += newLevel * 10;
            updateScore();
            
            // Check if reached max level
            if (newLevel === 9) {
                setTimeout(() => {
                    alert('🎉 恭喜！你創造了西瓜 (最高級水果)！');
                }, 100);
            }
        }
    }
}

function checkGameOverCondition() {
    if (gameOver) return;
    
    // Check if any settled fruit is above danger line
    const allBodies = World.allBodies(world);
    let fruitAboveLine = false;
    
    for (let body of allBodies) {
        // Skip current fruit being held and check only dropped fruits
        if (body.isFruit && body !== currentFruit && !body.isStatic) {
            // Check if fruit center is above danger line
            if (body.position.y < DANGER_LINE) {
                // Check if fruit is relatively still (settled)
                const velocity = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
                if (velocity < 2.0) { // Fruit is moving slowly or stopped
                    fruitAboveLine = true;
                    break;
                }
            }
        }
    }
    
    // If fruit is above line, increment timer
    if (fruitAboveLine) {
        dangerLineTimer++;
        // Game over after ~1 second (60 frames at 60fps)
        if (dangerLineTimer > 60) {
            triggerGameOver();
        }
    } else {
        // Reset timer if no fruits above line
        dangerLineTimer = 0;
    }
}

function triggerGameOver() {
    gameOver = true;
    canDrop = false;
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
}

function updateScore() {
    document.getElementById('score').textContent = `分數: ${score}`;
}

function updateNextFruit() {
    document.getElementById('next-level').textContent = nextFruitLevel;
}

function restartGame() {
    // Clean up old game
    if (world) {
        World.clear(world, false);
        Engine.clear(engine);
    }
    if (render) {
        Render.stop(render);
    }
    if (runner) {
        Runner.stop(runner);
    }
    
    // Start new game
    initGame();
}

// Event listeners
document.getElementById('restart').addEventListener('click', restartGame);

// Preload images and start game
preloadImages();
setTimeout(() => {
    initGame();
}, 100);
