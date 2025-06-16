import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202533);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);

const overlay = document.getElementById('overlay')!;
const hud = document.getElementById('hud')!;
const healthBar = document.getElementById('health')!;
const ammoCount = document.getElementById('ammo')!;
const scoreDisplay = document.getElementById('score')!;

overlay.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  overlay.style.display = 'none';
  hud.style.display = 'block';
});

controls.addEventListener('unlock', () => {
  overlay.style.display = 'block';
  hud.style.display = 'none';
});

// Game state
let playerHealth = 100;
let ammo = 30;
let score = 0;
let gameOver = false;

// Floor
const floorGeometry = new THREE.PlaneGeometry(200, 200, 10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 50, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

camera.position.y = 1.6;

// Weapon system
const crosshair = document.createElement('div');
crosshair.style.position = 'fixed';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.width = '4px';
crosshair.style.height = '4px';
crosshair.style.backgroundColor = 'white';
crosshair.style.borderRadius = '50%';
crosshair.style.pointerEvents = 'none';
crosshair.style.zIndex = '1000';
document.body.appendChild(crosshair);

// Bullet system
const bullets: THREE.Mesh[] = [];
const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

// Enemy system
const enemies: Enemy[] = [];
const enemyGeometry = new THREE.BoxGeometry(1, 2, 1);
const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

class Enemy {
  mesh: THREE.Mesh;
  health: number;
  speed: number;
  lastAttackTime: number;

  constructor(x: number, z: number) {
    this.mesh = new THREE.Mesh(enemyGeometry, enemyMaterial.clone());
    this.mesh.position.set(x, 1, z);
    this.mesh.castShadow = true;
    this.health = 50;
    this.speed = 2;
    this.lastAttackTime = 0;
    scene.add(this.mesh);
  }

  update(deltaTime: number, playerPosition: THREE.Vector3) {
    if (this.health <= 0) return;

    // Move towards player
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position)
      .normalize();
    
    this.mesh.position.x += direction.x * this.speed * deltaTime;
    this.mesh.position.z += direction.z * this.speed * deltaTime;

    // Attack player if close enough
    const distance = this.mesh.position.distanceTo(playerPosition);
    if (distance < 2 && Date.now() - this.lastAttackTime > 1000) {
      this.attackPlayer();
      this.lastAttackTime = Date.now();
    }

    // Update color based on health
    const healthPercent = this.health / 50;
    (this.mesh.material as THREE.MeshStandardMaterial).color.setRGB(
      1, 
      healthPercent * 0.3, 
      healthPercent * 0.3
    );
  }

  attackPlayer() {
    playerHealth -= 10;
    updateHUD();
    
    if (playerHealth <= 0) {
      gameOver = true;
      overlay.innerHTML = '<h1>GAME OVER</h1><p>Score: ' + score + '</p><p>Click to restart</p>';
      overlay.style.display = 'block';
      hud.style.display = 'none';
      controls.unlock();
    }
  }

  takeDamage(damage: number) {
    this.health -= damage;
    if (this.health <= 0) {
      scene.remove(this.mesh);
      score += 10;
      updateHUD();
    }
  }
}

// Spawn enemies
function spawnEnemy() {
  if (gameOver) return;
  
  const angle = Math.random() * Math.PI * 2;
  const distance = 50 + Math.random() * 50;
  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;
  
  enemies.push(new Enemy(x, z));
}

// Initial enemy spawn
for (let i = 0; i < 5; i++) {
  setTimeout(() => spawnEnemy(), i * 2000);
}

// Continue spawning enemies
setInterval(() => {
  if (!gameOver && enemies.filter(e => e.health > 0).length < 10) {
    spawnEnemy();
  }
}, 3000);

// Movement
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keys: Record<string, boolean> = {};

function onKeyDown(event: KeyboardEvent) {
  keys[event.code] = true;
  
  if (event.code === 'KeyR' && ammo < 30) {
    // Reload
    ammo = 30;
    updateHUD();
  }
}

function onKeyUp(event: KeyboardEvent) {
  keys[event.code] = false;
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Shooting
document.addEventListener('click', (event) => {
  if (controls.isLocked && !gameOver) {
    shoot();
  } else if (gameOver) {
    // Restart game
    restartGame();
  }
});

function shoot() {
  if (ammo <= 0) return;
  
  ammo--;
  updateHUD();
  
  // Create bullet
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  bullet.position.copy(camera.position);
  
  // Set bullet direction
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  bullet.userData = { velocity: direction.multiplyScalar(50) };
  
  bullets.push(bullet);
  scene.add(bullet);
  
  // Muzzle flash effect
  crosshair.style.backgroundColor = 'orange';
  setTimeout(() => {
    crosshair.style.backgroundColor = 'white';
  }, 50);
}

function restartGame() {
  // Reset game state
  playerHealth = 100;
  ammo = 30;
  score = 0;
  gameOver = false;
  
  // Clear enemies
  enemies.forEach(enemy => {
    scene.remove(enemy.mesh);
  });
  enemies.length = 0;
  
  // Clear bullets
  bullets.forEach(bullet => {
    scene.remove(bullet);
  });
  bullets.length = 0;
  
  // Reset position
  camera.position.set(0, 1.6, 0);
  
  // Update UI
  updateHUD();
  overlay.innerHTML = '<h1>Click to play</h1><p>WASD to move, Mouse to look and shoot, R to reload</p>';
  
  // Spawn initial enemies
  for (let i = 0; i < 5; i++) {
    setTimeout(() => spawnEnemy(), i * 2000);
  }
}

function updateHUD() {
  healthBar.style.width = playerHealth + '%';
  healthBar.style.backgroundColor = playerHealth > 30 ? '#00ff00' : '#ff0000';
  ammoCount.textContent = ammo.toString();
  scoreDisplay.textContent = score.toString();
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (gameOver) {
    renderer.render(scene, camera);
    return;
  }

  const delta = clock.getDelta();
  
  // Movement
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(keys['KeyW']) - Number(keys['KeyS']);
  direction.x = Number(keys['KeyD']) - Number(keys['KeyA']);
  direction.normalize();

  if (keys['KeyW'] || keys['KeyS']) velocity.z -= direction.z * 400.0 * delta;
  if (keys['KeyA'] || keys['KeyD']) velocity.x -= direction.x * 400.0 * delta;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const velocity = bullet.userData.velocity;
    
    bullet.position.add(velocity.clone().multiplyScalar(delta));
    
    // Check for enemy hits
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (enemy.health > 0 && bullet.position.distanceTo(enemy.mesh.position) < 1) {
        enemy.takeDamage(25);
        scene.remove(bullet);
        bullets.splice(i, 1);
        
        if (enemy.health <= 0) {
          enemies.splice(j, 1);
        }
        break;
      }
    }
    
    // Remove bullets that are too far
    if (bullet.position.length() > 200) {
      scene.remove(bullet);
      bullets.splice(i, 1);
    }
  }
  
  // Update enemies
  const playerPosition = camera.position.clone();
  enemies.forEach(enemy => {
    enemy.update(delta, playerPosition);
  });

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize HUD
updateHUD();
