import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.FogExp2(0x87CEEB, 0.0025); // Exponential fog for better depth

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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
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

// Enhanced Game State
let playerHealth = 100;
let maxHealth = 100;
let ammo = 30;
let maxAmmo = 30;
let score = 0;
let wave = 1;
let enemiesKilled = 0;
let gameOver = false;
let isReloading = false;
let lastDamageTime = 0;
let recoilOffset = new THREE.Vector3();

// Movement variables
const moveSpeed = 15;
const jumpHeight = 8;
let isOnGround = true;
let verticalVelocity = 0;
const gravity = -25;

// Weapon System
enum WeaponType {
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun',
  PISTOL = 'pistol'
}

interface Weapon {
  type: WeaponType;
  damage: number;
  fireRate: number;
  maxAmmo: number;
  reloadTime: number;
  spread: number;
  recoil: number;
}

const weapons: Record<WeaponType, Weapon> = {
  [WeaponType.RIFLE]: {
    type: WeaponType.RIFLE,
    damage: 25,
    fireRate: 150,
    maxAmmo: 30,
    reloadTime: 2000,
    spread: 0.02,
    recoil: 0.05
  },
  [WeaponType.SHOTGUN]: {
    type: WeaponType.SHOTGUN,
    damage: 15,
    fireRate: 800,
    maxAmmo: 8,
    reloadTime: 3000,
    spread: 0.15,
    recoil: 0.15
  },
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    damage: 20,
    fireRate: 300,
    maxAmmo: 15,
    reloadTime: 1500,
    spread: 0.05,
    recoil: 0.08
  }
};

let currentWeapon = weapons[WeaponType.RIFLE];
let lastShotTime = 0;

// Enhanced Floor with texture
const floorGeometry = new THREE.PlaneGeometry(400, 400, 20, 20);
const floorTexture = new THREE.DataTexture(
  new Uint8Array([64, 64, 64, 255, 96, 96, 96, 255, 64, 64, 64, 255, 96, 96, 96, 255]),
  2, 2, THREE.RGBAFormat
);
floorTexture.magFilter = THREE.NearestFilter;
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(50, 50);
const floorMaterial = new THREE.MeshStandardMaterial({ 
  map: floorTexture,
  roughness: 0.8,
  metalness: 0.1
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Create Terrain with Height Map
const terrainSize = 500;
const terrainSegments = 100;
const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);

// Generate height map for terrain
const positions = terrainGeometry.attributes.position.array;
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i];
  const z = positions[i + 1];
  
  // Create hills and valleys using noise
  const height = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 8 +
                 Math.sin(x * 0.02) * Math.sin(z * 0.02) * 4 +
                 Math.sin(x * 0.05) * Math.cos(z * 0.03) * 2;
  
  positions[i + 2] = height;
}

terrainGeometry.attributes.position.needsUpdate = true;
terrainGeometry.computeVertexNormals();

// Enhanced Terrain with better materials
function createEnhancedGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Create grass base
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, '#4a7c59');
  gradient.addColorStop(0.5, '#2d5016');
  gradient.addColorStop(1, '#1e3a0f');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  // Add noise for texture variation
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 3 + 1;
    const brightness = Math.random() * 0.3 + 0.7;
    
    ctx.fillStyle = `rgba(${Math.floor(34 * brightness)}, ${Math.floor(139 * brightness)}, ${Math.floor(34 * brightness)}, 0.8)`;
    ctx.fillRect(x, y, size, size);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(25, 25);
  return texture;
}

const enhancedGrassTexture = createEnhancedGrassTexture();

const terrainMaterial = new THREE.MeshStandardMaterial({ 
  map: enhancedGrassTexture,
  normalScale: new THREE.Vector2(0.5, 0.5),
  roughness: 0.8,
  metalness: 0.1,
  color: 0x7CFC00
});

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.rotation.x = -Math.PI / 2;
terrain.receiveShadow = true;
scene.add(terrain);

// Function to get terrain height at position
function getTerrainHeight(x: number, z: number): number {
  // Simple height calculation based on our terrain generation
  const height = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 8 +
                 Math.sin(x * 0.02) * Math.sin(z * 0.02) * 4 +
                 Math.sin(x * 0.05) * Math.cos(z * 0.03) * 2;
  return height;
}

// Enhanced Tree Creation with LOD
function createTree(x: number, z: number, height: number = 0) {
  const treeGroup = new THREE.Group();
  
  // Enhanced trunk with better geometry
  const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.6, 8, 12);
  const trunkMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 1.0,
    metalness: 0,
    normalScale: new THREE.Vector2(0.8, 0.8)
  });
  
  // Add bark texture simulation
  trunkMaterial.bumpScale = 0.2;
  
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 4;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  treeGroup.add(trunk);
  
  // Enhanced leaves with multiple layers
  const leavesGeometry1 = new THREE.SphereGeometry(4, 12, 8);
  const leavesGeometry2 = new THREE.SphereGeometry(3.5, 12, 8);
  const leavesGeometry3 = new THREE.SphereGeometry(2.8, 12, 8);
  
  const leavesMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x228B22,
    roughness: 0.9,
    metalness: 0,
    transparent: true,
    opacity: 0.9
  });
  
  const leaves1 = new THREE.Mesh(leavesGeometry1, leavesMaterial);
  leaves1.position.y = 8;
  leaves1.castShadow = true;
  leaves1.receiveShadow = true;
  
  const leaves2 = new THREE.Mesh(leavesGeometry2, leavesMaterial);
  leaves2.position.set(0.5, 9.5, 0.3);
  leaves2.castShadow = true;
  
  const leaves3 = new THREE.Mesh(leavesGeometry3, leavesMaterial);
  leaves3.position.set(-0.3, 11, -0.2);
  leaves3.castShadow = true;
  
  treeGroup.add(leaves1, leaves2, leaves3);
  
  // Add random rotation for variety
  treeGroup.rotation.y = Math.random() * Math.PI * 2;
  treeGroup.scale.setScalar(0.8 + Math.random() * 0.4);
  
  treeGroup.position.set(x, height, z);
  scene.add(treeGroup);
  return treeGroup;
}

// Enhanced House with detailed materials
function createHouse(x: number, z: number, height: number = 0) {
  const houseGroup = new THREE.Group();
  
  // Enhanced base with better materials
  const baseGeometry = new THREE.BoxGeometry(8, 6, 8);
  const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xD2691E,
    roughness: 0.7,
    metalness: 0,
    bumpScale: 0.3
  });
  
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 3;
  base.castShadow = true;
  base.receiveShadow = true;
  houseGroup.add(base);
  
  // Enhanced roof with shingles effect
  const roofGeometry = new THREE.ConeGeometry(6.5, 4.5, 8);
  const roofMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B0000,
    roughness: 0.9,
    metalness: 0.1,
    bumpScale: 0.5
  });
  
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 8.5;
  roof.rotation.y = Math.PI / 8;
  roof.castShadow = true;
  houseGroup.add(roof);
  
  // Enhanced door
  const doorGeometry = new THREE.BoxGeometry(1.8, 3.5, 0.3);
  const doorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x654321,
    roughness: 0.8,
    metalness: 0
  });
  
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(0, 1.75, 4.15);
  door.castShadow = true;
  houseGroup.add(door);
  
  // Door handle
  const handleGeometry = new THREE.SphereGeometry(0.08, 8, 6);
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    roughness: 0.2,
    metalness: 0.8
  });
  
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.set(0.7, 1.75, 4.3);
  houseGroup.add(handle);
  
  // Enhanced windows with frames
  const windowFrameGeometry = new THREE.BoxGeometry(2, 2, 0.2);
  const windowFrameMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.6,
    metalness: 0
  });
  
  const windowGeometry = new THREE.BoxGeometry(1.6, 1.6, 0.1);
  const windowMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x87CEEB,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7
  });
  
  // Left window
  const windowFrame1 = new THREE.Mesh(windowFrameGeometry, windowFrameMaterial);
  windowFrame1.position.set(-2.5, 3, 4.1);
  const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
  window1.position.set(-2.5, 3, 4.15);
  houseGroup.add(windowFrame1, window1);
  
  // Right window
  const windowFrame2 = new THREE.Mesh(windowFrameGeometry, windowFrameMaterial);
  windowFrame2.position.set(2.5, 3, 4.1);
  const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
  window2.position.set(2.5, 3, 4.15);
  houseGroup.add(windowFrame2, window2);
  
  // Chimney
  const chimneyGeometry = new THREE.BoxGeometry(1, 3, 1);
  const chimneyMaterial = new THREE.MeshStandardMaterial({
    color: 0x696969,
    roughness: 0.9,
    metalness: 0
  });
  
  const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
  chimney.position.set(2, 9.5, -2);
  chimney.castShadow = true;
  houseGroup.add(chimney);
  
  houseGroup.position.set(x, height, z);
  scene.add(houseGroup);
  return houseGroup;
}

// Enhanced Flowers with particle effects
function createFlower(x: number, z: number, height: number = 0) {
  const flowerGroup = new THREE.Group();
  
  // Enhanced stem
  const stemGeometry = new THREE.CylinderGeometry(0.03, 0.06, 1.2, 8);
  const stemMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x228B22,
    roughness: 0.8,
    metalness: 0
  });
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.y = 0.6;
  stem.castShadow = true;
  flowerGroup.add(stem);
  
  // Enhanced flower with petals
  const petalGeometry = new THREE.SphereGeometry(0.15, 8, 6);
  const colors = [0xFF69B4, 0xFF6347, 0x9370DB, 0x00CED1, 0xFFD700, 0xFF1493, 0x32CD32];
  const flowerColor = colors[Math.floor(Math.random() * colors.length)];
  
  const petalMaterial = new THREE.MeshStandardMaterial({ 
    color: flowerColor,
    roughness: 0.3,
    metalness: 0,
    emissive: new THREE.Color(flowerColor).multiplyScalar(0.1)
  });
  
  // Create multiple petals
  for (let i = 0; i < 6; i++) {
    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    const angle = (i / 6) * Math.PI * 2;
    petal.position.set(
      Math.cos(angle) * 0.2,
      1.3,
      Math.sin(angle) * 0.2
    );
    petal.scale.set(1, 0.6, 0.8);
    flowerGroup.add(petal);
  }
  
  // Flower center
  const centerGeometry = new THREE.SphereGeometry(0.08, 8, 6);
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    roughness: 0.4,
    metalness: 0.2,
    emissive: 0x332200
  });
  
  const center = new THREE.Mesh(centerGeometry, centerMaterial);
  center.position.y = 1.3;
  flowerGroup.add(center);
  
  // Add subtle swaying animation
  flowerGroup.userData.swayPhase = Math.random() * Math.PI * 2;
  
  flowerGroup.position.set(x, height, z);
  flowerGroup.scale.setScalar(0.7 + Math.random() * 0.6);
  scene.add(flowerGroup);
  return flowerGroup;
}

// Enhanced Rocks with better geometry
function createRock(x: number, z: number, height: number = 0) {
  const rockSize = 0.8 + Math.random() * 1.5;
  const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 1);
  
  // Randomly deform vertices for more natural look
  const positions = rockGeometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += (Math.random() - 0.5) * 0.3;
    positions[i + 1] += (Math.random() - 0.5) * 0.3;
    positions[i + 2] += (Math.random() - 0.5) * 0.3;
  }
  rockGeometry.attributes.position.needsUpdate = true;
  rockGeometry.computeVertexNormals();
  
  const rockMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x696969,
    roughness: 0.9,
    metalness: 0.1,
    bumpScale: 0.5
  });
  
  const rock = new THREE.Mesh(rockGeometry, rockMaterial);
  rock.position.set(x, height + rockSize * 0.3, z);
  rock.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI
  );
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  return rock;
}

// Generate World
function generateWorld() {
  // Create forests
  for (let i = 0; i < 150; i++) {
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    const height = getTerrainHeight(x, z);
    createTree(x, z, height);
  }
  
  // Create villages (3 villages)
  const villages = [
    { x: -80, z: -80 },
    { x: 100, z: -60 },
    { x: -40, z: 120 }
  ];
  
  villages.forEach(village => {
    const villageHeight = getTerrainHeight(village.x, village.z);
    
    // Create houses in village
    for (let i = 0; i < 5; i++) {
      const houseX = village.x + (Math.random() - 0.5) * 40;
      const houseZ = village.z + (Math.random() - 0.5) * 40;
      const houseHeight = getTerrainHeight(houseX, houseZ);
      createHouse(houseX, houseZ, houseHeight);
    }
  });
  
  // Create flowers scattered around
  for (let i = 0; i < 300; i++) {
    const x = (Math.random() - 0.5) * 450;
    const z = (Math.random() - 0.5) * 450;
    const height = getTerrainHeight(x, z);
    createFlower(x, z, height);
  }
  
  // Create rocks
  for (let i = 0; i < 50; i++) {
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    const height = getTerrainHeight(x, z);
    createRock(x, z, height);
  }
}

// Generate the world
generateWorld();

// Enhanced Lighting System
const ambientLight = new THREE.AmbientLight(0x9DB4FF, 0.3);
scene.add(ambientLight);

// Main sun light with warmer color
const sunLight = new THREE.DirectionalLight(0xFFF8DC, 1.8);
sunLight.position.set(150, 120, 80);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.near = 0.1;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
sunLight.shadow.bias = -0.0001;
scene.add(sunLight);

// Secondary light for fill lighting
const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.4);
fillLight.position.set(-100, 50, -50);
scene.add(fillLight);

// Atmospheric rim light
const rimLight = new THREE.DirectionalLight(0xFFE4B5, 0.6);
rimLight.position.set(0, 10, -100);
scene.add(rimLight);

// Add some clouds
function createCloud(x: number, y: number, z: number) {
  const cloudGroup = new THREE.Group();
  
  for (let i = 0; i < 8; i++) {
    const cloudGeometry = new THREE.SphereGeometry(6 + Math.random() * 8, 16, 12);
    const cloudMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.6 + Math.random() * 0.3,
      roughness: 1.0,
      metalness: 0,
      emissive: 0x111122,
      emissiveIntensity: 0.1
    });
    
    const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloudPart.position.set(
      (Math.random() - 0.5) * 25,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 25
    );
    cloudPart.scale.setScalar(0.8 + Math.random() * 0.4);
    cloudGroup.add(cloudPart);
  }
  
  cloudGroup.position.set(x, y, z);
  
  // Add slow rotation
  cloudGroup.userData.rotationSpeed = (Math.random() - 0.5) * 0.002;
  
  scene.add(cloudGroup);
  return cloudGroup;
}

// Create some clouds
for (let i = 0; i < 10; i++) {
  createCloud(
    (Math.random() - 0.5) * 800,
    80 + Math.random() * 40,
    (Math.random() - 0.5) * 800
  );
}

// Set initial camera position on terrain
camera.position.set(0, getTerrainHeight(0, 0) + 1.6, 0);

// Enhanced Weapon system with crosshair
const crosshair = document.createElement('div');
crosshair.innerHTML = '+';
crosshair.style.position = 'fixed';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.color = 'rgba(255, 255, 255, 0.8)';
crosshair.style.fontSize = '20px';
crosshair.style.fontFamily = 'monospace';
crosshair.style.fontWeight = 'bold';
crosshair.style.pointerEvents = 'none';
crosshair.style.zIndex = '1000';
crosshair.style.textShadow = '0 0 5px rgba(0, 0, 0, 0.8)';
document.body.appendChild(crosshair);

// Particle Systems
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 1000;
const particlePositions = new Float32Array(particleCount * 3);
const velocities = new Float32Array(particleCount * 3);
const lifetimes = new Float32Array(particleCount);

for (let i = 0; i < particleCount * 3; i++) {
  particlePositions[i] = 0;
  velocities[i] = 0;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
  color: 0xff4400,
  size: 0.1,
  transparent: true,
  opacity: 0.8
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Enhanced Bullet system
const bullets: Array<{
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
}> = [];
const bulletGeometry = new THREE.SphereGeometry(0.02, 6, 6);
const bulletMaterial = new THREE.MeshBasicMaterial({ 
  color: 0xffff00,
  emissive: 0x332200
});

// Enhanced Enemy system with different types
enum EnemyType {
  BASIC = 'basic',
  FAST = 'fast',
  HEAVY = 'heavy',
  BOSS = 'boss'
}

interface EnemyConfig {
  health: number;
  speed: number;
  damage: number;
  color: number;
  size: [number, number, number];
  score: number;
}

const enemyConfigs: Record<EnemyType, EnemyConfig> = {
  [EnemyType.BASIC]: {
    health: 50,
    speed: 2,
    damage: 10,
    color: 0xff0000,
    size: [1, 2, 1],
    score: 10
  },
  [EnemyType.FAST]: {
    health: 25,
    speed: 4,
    damage: 5,
    color: 0xff4400,
    size: [0.8, 1.5, 0.8],
    score: 15
  },
  [EnemyType.HEAVY]: {
    health: 100,
    speed: 1,
    damage: 20,
    color: 0x880000,
    size: [1.5, 2.5, 1.5],
    score: 25
  },
  [EnemyType.BOSS]: {
    health: 200,
    speed: 1.5,
    damage: 30,
    color: 0x440088,
    size: [2, 3, 2],
    score: 100
  }
};

class Enemy {
  mesh: THREE.Mesh;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  score: number;
  lastAttackTime: number;
  type: EnemyType;
  attackAnimation: number;

  constructor(x: number, z: number, type: EnemyType = EnemyType.BASIC) {
    this.type = type;
    const config = enemyConfigs[type];
    
    const geometry = new THREE.BoxGeometry(...config.size);
    const material = new THREE.MeshStandardMaterial({ 
      color: config.color,
      roughness: 0.8,
      metalness: 0.2,
      emissive: new THREE.Color(config.color).multiplyScalar(0.1)
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, config.size[1] / 2, z);
    this.mesh.castShadow = true;
    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.damage = config.damage;
    this.score = config.score;
    this.lastAttackTime = 0;
    this.attackAnimation = 0;
    scene.add(this.mesh);
  }

  update(deltaTime: number, playerPosition: THREE.Vector3) {
    if (this.health <= 0) return;

    // Enhanced AI movement with obstacles avoidance
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position)
      .normalize();
    
    // Add some randomness to movement
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      0,
      (Math.random() - 0.5) * 0.1
    );
    direction.add(randomOffset);
    
    this.mesh.position.x += direction.x * this.speed * deltaTime;
    this.mesh.position.z += direction.z * this.speed * deltaTime;

    // Look at player
    this.mesh.lookAt(playerPosition);

    // Attack animation
    if (this.attackAnimation > 0) {
      this.attackAnimation -= deltaTime * 5;
      this.mesh.scale.setScalar(1 + this.attackAnimation * 0.2);
    } else {
      this.mesh.scale.setScalar(1);
    }

    // Attack player if close enough
    const distance = this.mesh.position.distanceTo(playerPosition);
    if (distance < 3 && Date.now() - this.lastAttackTime > 1000) {
      this.attackPlayer();
      this.lastAttackTime = Date.now();
      this.attackAnimation = 1;
    }

    // Update color based on health
    const healthPercent = this.health / this.maxHealth;
    const config = enemyConfigs[this.type];
    const color = new THREE.Color(config.color);
    color.lerp(new THREE.Color(0x000000), 1 - healthPercent);
    (this.mesh.material as THREE.MeshStandardMaterial).color = color;
  }

  attackPlayer() {
    playerHealth -= this.damage;
    lastDamageTime = Date.now();
    updateHUD();
    
    // Screen shake effect
    recoilOffset.add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      0
    ));
    
    if (playerHealth <= 0) {
      gameOver = true;
      overlay.innerHTML = `
        <h1>GAME OVER</h1>
        <p>Wave: ${wave}</p>
        <p>Score: ${score}</p>
        <p>Enemies Killed: ${enemiesKilled}</p>
        <p>Click to restart</p>
      `;
      overlay.style.display = 'block';
      hud.style.display = 'none';
      controls.unlock();
    }
  }

  takeDamage(damage: number) {
    this.health -= damage;
    
    // Damage effect
    const flashMaterial = this.mesh.material as THREE.MeshStandardMaterial;
    const originalColor = flashMaterial.color.clone();
    flashMaterial.color.setHex(0xffffff);
    setTimeout(() => {
      flashMaterial.color.copy(originalColor);
    }, 50);
    
    if (this.health <= 0) {
      // Death particle effect
      this.spawnDeathParticles();
      scene.remove(this.mesh);
      score += this.score;
      enemiesKilled++;
      updateHUD();
    }
  }

  spawnDeathParticles() {
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xff4400 })
      );
      particle.position.copy(this.mesh.position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 5
      );
      
      scene.add(particle);
      
      // Animate particle
      const animateParticle = () => {
        particle.position.add(velocity.clone().multiplyScalar(0.02));
        velocity.y -= 0.01; // gravity
        particle.scale.multiplyScalar(0.98);
        
        if (particle.scale.x > 0.01) {
          requestAnimationFrame(animateParticle);
        } else {
          scene.remove(particle);
        }
      };
      animateParticle();
    }
  }
}

const enemies: Enemy[] = [];

// Wave System
function getEnemyTypeForWave(): EnemyType {
  if (wave >= 10 && Math.random() < 0.1) return EnemyType.BOSS;
  if (wave >= 5 && Math.random() < 0.3) return EnemyType.HEAVY;
  if (wave >= 3 && Math.random() < 0.4) return EnemyType.FAST;
  return EnemyType.BASIC;
}

function spawnWave() {
  if (gameOver) return;
  
  const enemyCount = Math.min(3 + wave * 2, 15);
  
  for (let i = 0; i < enemyCount; i++) {
    setTimeout(() => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 50;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      const enemyType = getEnemyTypeForWave();
      enemies.push(new Enemy(x, z, enemyType));
    }, i * 500);
  }
}

// Initial wave
spawnWave();

// Check for next wave
setInterval(() => {
  if (!gameOver && enemies.filter(e => e.health > 0).length === 0) {
    wave++;
    setTimeout(() => spawnWave(), 2000);
    updateHUD();
  }
}, 1000);

// Shooting
document.addEventListener('click', (event) => {
  if (controls.isLocked && !gameOver) {
    shoot();
  } else if (gameOver) {
    // Restart game
    restartGame();
  }
});

// Enhanced shooting system
function shoot() {
  if (ammo <= 0 || isReloading) return;
  if (Date.now() - lastShotTime < currentWeapon.fireRate) return;
  
  lastShotTime = Date.now();
  ammo--;
  updateHUD();
  
  // Recoil effect
  recoilOffset.add(new THREE.Vector3(
    (Math.random() - 0.5) * currentWeapon.recoil,
    -currentWeapon.recoil * 0.5,
    0
  ));
  
  // Enhanced muzzle flash
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  createMuzzleFlash(camera.position, direction);
  
  // Create bullets (shotgun creates multiple)
  const bulletCount = currentWeapon.type === WeaponType.SHOTGUN ? 5 : 1;
  
  for (let i = 0; i < bulletCount; i++) {
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(camera.position);
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Add spread
    direction.x += (Math.random() - 0.5) * currentWeapon.spread;
    direction.y += (Math.random() - 0.5) * currentWeapon.spread;
    direction.z += (Math.random() - 0.5) * currentWeapon.spread;
    direction.normalize();
    
    bullets.push({
      mesh: bullet,
      velocity: direction.multiplyScalar(100),
      lifetime: 3
    });
    scene.add(bullet);
    
    // Add bullet trails for visual feedback
    for (let i = 0; i < bulletCount; i++) {
      const startPos = camera.position.clone();
      const endPos = startPos.clone().add(direction.clone().multiplyScalar(50));
      createBulletTrail(startPos, endPos);
    }
  }
}

function reload() {
  if (isReloading) return;
  
  isReloading = true;
  crosshair.style.color = 'red';
  
  setTimeout(() => {
    ammo = currentWeapon.maxAmmo;
    isReloading = false;
    crosshair.style.color = 'rgba(255, 255, 255, 0.8)';
    updateHUD();
  }, currentWeapon.reloadTime);
}

function restartGame() {
  // Reset game state
  playerHealth = 100;
  ammo = 30;
  score = 0;
  wave = 1;
  enemiesKilled = 0;
  gameOver = false;
  isReloading = false;
  
  // Clear enemies
  enemies.forEach(enemy => {
    scene.remove(enemy.mesh);
  });
  enemies.length = 0;
  
  // Clear bullets
  bullets.forEach(bullet => {
    scene.remove(bullet.mesh);
  });
  bullets.length = 0;
  
  // Reset position
  camera.position.set(0, getTerrainHeight(0, 0) + 1.6, 0);
  
  // Update UI
  updateHUD();
  overlay.innerHTML = '<h1>FPS SURVIVAL</h1><p>🎯 Click to play</p><p>🎮 WASD to move, SPACE to jump, Mouse to look and shoot</p><p>🔄 R to reload, 1-3 to switch weapons</p><p>🏆 Explore the villages and survive the waves!</p>';
  
  // Spawn initial wave
  spawnWave();
}

// Enhanced UI
const overlay = document.getElementById('overlay')!;
const hud = document.getElementById('hud')!;
const healthBar = document.getElementById('health')!;
const ammoCount = document.getElementById('ammo')!;
const scoreDisplay = document.getElementById('score')!;
const waveDisplay = document.getElementById('wave')!;
const crosshair = document.getElementById('crosshair')!;

function updateHUD() {
  healthBar.style.width = Math.max(0, playerHealth) + '%';
  healthBar.style.backgroundColor = playerHealth > 30 ? '#00ff00' : '#ff0000';
  
  // Add health regeneration effect
  if (Date.now() - lastDamageTime > 5000 && playerHealth < maxHealth) {
    playerHealth = Math.min(maxHealth, playerHealth + 0.1);
  }
  
  ammoCount.textContent = isReloading ? 'RELOADING...' : `${ammo}/${currentWeapon.maxAmmo}`;
  scoreDisplay.textContent = score.toString();
  waveDisplay.textContent = `Wave ${wave}`;
  
  // Update weapon display
  const weaponDisplay = document.getElementById('weapon') || (() => {
    const elem = document.createElement('div');
    elem.id = 'weapon';
    elem.className = 'weapon-display';
    hud.appendChild(elem);
    return elem;
  })();
  weaponDisplay.textContent = `${currentWeapon.type.toUpperCase()}`;
}

// Muzzle flash light
const muzzleLight = new THREE.PointLight(0xff8800, 0, 5);
muzzleLight.position.copy(camera.position);
scene.add(muzzleLight);

// Movement
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keys: Record<string, boolean> = {};

function onKeyDown(event: KeyboardEvent) {
  keys[event.code] = true;
  
  if (event.code === 'KeyR' && ammo < currentWeapon.maxAmmo && !isReloading) {
    reload();
  }
  
  // Weapon switching
  if (event.code === 'Digit1') currentWeapon = weapons[WeaponType.RIFLE];
  if (event.code === 'Digit2') currentWeapon = weapons[WeaponType.SHOTGUN];
  if (event.code === 'Digit3') currentWeapon = weapons[WeaponType.PISTOL];
  
  // Jump
  if (event.code === 'Space' && isOnGround) {
    verticalVelocity = jumpHeight;
    isOnGround = false;
  }
}

function onKeyUp(event: KeyboardEvent) {
  keys[event.code] = false;
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

const clock = new THREE.Clock();

// Enhance bullet with trail effect
function createBulletTrail(startPos: THREE.Vector3, endPos: THREE.Vector3) {
  const trailGeometry = new THREE.BufferGeometry();
  const trailMaterial = new THREE.LineBasicMaterial({
    color: 0xFFFF00,
    transparent: true,
    opacity: 0.8
  });
  
  const positions = new Float32Array([
    startPos.x, startPos.y, startPos.z,
    endPos.x, endPos.y, endPos.z
  ]);
  
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const trail = new THREE.Line(trailGeometry, trailMaterial);
  
  scene.add(trail);
  
  // Fade out trail
  let opacity = 0.8;
  const fadeTrail = () => {
    opacity -= 0.05;
    trailMaterial.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(fadeTrail);
    } else {
      scene.remove(trail);
    }
  };
  fadeTrail();
}

// Enhanced muzzle flash
function createMuzzleFlash(position: THREE.Vector3, direction: THREE.Vector3) {
  const flashGeometry = new THREE.SphereGeometry(0.5, 8, 6);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFAA00,
    transparent: true,
    opacity: 1.0
  });
  
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.position.copy(position).add(direction.clone().multiplyScalar(1));
  scene.add(flash);
  
  // Animate flash
  let scale = 1;
  let opacity = 1;
  const animateFlash = () => {
    scale += 0.3;
    opacity -= 0.1;
    flash.scale.setScalar(scale);
    flashMaterial.opacity = opacity;
    
    if (opacity > 0) {
      requestAnimationFrame(animateFlash);
    } else {
      scene.remove(flash);
    }
  };
  animateFlash();
}

// Enhanced animation loop with dynamic effects
function animate() {
  requestAnimationFrame(animate);

  if (gameOver) {
    renderer.render(scene, camera);
    return;
  }

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();
  
  // Apply recoil
  if (recoilOffset.length() > 0.001) {
    camera.rotation.x += recoilOffset.y * delta * 10;
    camera.rotation.y += recoilOffset.x * delta * 10;
    recoilOffset.multiplyScalar(0.9);
  }
  
  // Fixed Movement System
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  
  camera.getWorldDirection(forward);
  forward.y = 0; // Keep movement horizontal
  forward.normalize();
  
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
  right.normalize();
  
  // Reset movement
  const movement = new THREE.Vector3();
  
  // Calculate movement direction - CORRECTED
  if (keys['KeyW']) movement.add(forward);      // W = Forward
  if (keys['KeyS']) movement.sub(forward);      // S = Backward  
  if (keys['KeyA']) movement.sub(right);        // A = Left
  if (keys['KeyD']) movement.add(right);        // D = Right
  if (keys['KeyQ']) {                           // Q = Strafe Forward Left
    movement.add(forward);
    movement.sub(right);
  }
  if (keys['KeyE']) {                           // E = Strafe Forward Right
    movement.add(forward);
    movement.add(right);
  }
  
  // Normalize and apply speed
  if (movement.length() > 0) {
    movement.normalize();
    movement.multiplyScalar(moveSpeed * delta);
    
    // Calculate new position
    const newPosition = camera.position.clone().add(movement);
    
    // Get terrain height at new position
    const terrainHeight = getTerrainHeight(newPosition.x, newPosition.z);
    
    // Apply movement
    camera.position.x = newPosition.x;
    camera.position.z = newPosition.z;
    
    // Handle vertical movement and terrain following
    if (isOnGround) {
      camera.position.y = terrainHeight + 1.6;
    }
  }
  
  // Apply gravity and vertical movement
  if (!isOnGround) {
    verticalVelocity += gravity * delta;
    camera.position.y += verticalVelocity * delta;
    
    // Check if landed on terrain
    const currentTerrainHeight = getTerrainHeight(camera.position.x, camera.position.z);
    if (camera.position.y <= currentTerrainHeight + 1.6) {
      camera.position.y = currentTerrainHeight + 1.6;
      isOnGround = true;
      verticalVelocity = 0;
    }
  } else {
    // Keep player on terrain when on ground
    const currentTerrainHeight = getTerrainHeight(camera.position.x, camera.position.z);
    camera.position.y = currentTerrainHeight + 1.6;
  }

  // Enhanced bullet physics
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.lifetime -= delta;
    
    if (bullet.lifetime <= 0) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      continue;
    }
    
    bullet.mesh.position.add(bullet.velocity.clone().multiplyScalar(delta));
    
    // Enhanced hit detection with better feedback
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (enemy.health > 0 && bullet.mesh.position.distanceTo(enemy.mesh.position) < 1.5) {
        enemy.takeDamage(currentWeapon.damage);
        scene.remove(bullet.mesh);
        bullets.splice(i, 1);
        
        if (enemy.health <= 0) {
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }
  
  // Update enemies with enhanced AI
  const playerPosition = camera.position.clone();
  enemies.forEach(enemy => {
    enemy.update(delta, playerPosition);
  });

  // Screen damage effect
  if (Date.now() - lastDamageTime < 500) {
    const intensity = 1 - (Date.now() - lastDamageTime) / 500;
    renderer.setClearColor(new THREE.Color(0x330000).lerp(new THREE.Color(0x101520), 1 - intensity));
  } else {
    renderer.setClearColor(0x101520);
  }

  // Animate clouds
  scene.traverse((object) => {
    if (object.userData.rotationSpeed) {
      object.rotation.y += object.userData.rotationSpeed;
    }
    
    // Animate flowers swaying
    if (object.userData.swayPhase !== undefined) {
      object.rotation.z = Math.sin(time * 2 + object.userData.swayPhase) * 0.1;
    }
  });
  
  // Dynamic lighting based on time of day
  const lightIntensity = 1.5 + Math.sin(time * 0.1) * 0.3;
  sunLight.intensity = lightIntensity;
  
  // Subtle camera bobbing when moving
  if (movement.length() > 0) {
    camera.position.y += Math.sin(time * 15) * 0.02;
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize enhanced HUD
updateHUD();
