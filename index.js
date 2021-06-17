import { VRButton } from "https://unpkg.com/three@0.129.0/examples/jsm/webxr/VRButton.js";

const {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  DirectionalLight,
  AmbientLight,
  Mesh,
  Group,
  BoxGeometry,
  MeshStandardMaterial,
  ShaderMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  OrbitControls,
  TextureLoader,
  Sprite,
  SpriteMaterial,
  Box3,
  Vector3,
  Color,
  Box3Helper,
  RepeatWrapping,
  AdditiveBlending,
} = THREE;

const gridSize = 32;
const gs2 = gridSize ** 2;
const gs3 = gridSize ** 3;
let grid = new Uint8Array(gs3);
let newGrid = new Uint8Array(gs3);

const scene = new Scene();

const vertexShader = `
uniform float scale;
attribute float size;
varying float dis;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = scale * size * ( 100.0 / -mvPosition.z );
  dis = gl_PointSize;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform sampler2D pointTexture;
uniform vec3 color;
varying float dis;
void main() {
  if (dis < 2.0) discard;
  gl_FragColor = vec4(color, 1.0) * texture2D( pointTexture, gl_PointCoord );;
}
`;

const minSpriteSize = 0.00001;

const config = {
  enabled: true,
  wrap: false,
  randomRatio: 0.98,
  particleSize: 6,
  delay: 60,
  lonely: 16,
  crowded: 23,
  birth: 4,
  randomize,
  updateGrid,
};
const gui = new dat.GUI();
gui.add(config, "enabled");
gui.add(config, "wrap");
gui.add(config, "randomRatio", 0, 1);
gui.add(config, "particleSize", 1, 200);
gui.add(config, "delay", 0, 1000, 10);
gui.add(config, "lonely", 0, 125, 1);
gui.add(config, "crowded", 0, 125, 1);
gui.add(config, "birth", 0, 125, 1);
gui.add(config, "randomize");
gui.add(config, "updateGrid");
gui.closed = true;

const camera = new PerspectiveCamera();
camera.position.set(0, 1.3, 0);

const renderer = new WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
document.body.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);

const box = new Box3();
box.setFromCenterAndSize(new Vector3(0, 0, 0), new Vector3(gridSize, gridSize, gridSize));
const helper = new Box3Helper(box, 0x8d5400);

const gridGroup = new Group();
gridGroup.position.set(0, 1.3, -0.8);
gridGroup.add(helper);
scene.add(gridGroup);

controls.target = gridGroup.position;
controls.update();

const pointTexture = new TextureLoader().load("sprite.png");
const pointMaterial = new ShaderMaterial({
  uniforms: {
    pointTexture: { value: pointTexture },
    color: { value: new Color(0xff6200) },
    scale: { value: 10 },
  },
  vertexShader,
  fragmentShader,
  alphaTest: 0.5,
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: AdditiveBlending,
});

gridGroup.scale.setScalar(1 / gridSize / 2);
pointMaterial.uniforms.scale.value = gridGroup.scale.x * config.particleSize;

const pointPositions = [];
const pointSizes = [];

for (let i = 0; i < gs3; i++) {
  const x = i % gridSize;
  const y = ((i - x) / gridSize) % gridSize;
  const z = (i - y * gridSize - x) / gs2;
  pointPositions.push(x - gridSize / 2 + 0.5, y - gridSize / 2 + 0.5, z - gridSize / 2 + 0.5);
  pointSizes.push(1);
}

const pointGeometry = (window.pointGeometry = new BufferGeometry());
pointGeometry.setAttribute("position", new Float32BufferAttribute(pointPositions, 3));
pointGeometry.setAttribute("size", new Float32BufferAttribute(pointSizes, 1));

const points = new Points(pointGeometry, pointMaterial);
gridGroup.add(points);

function createGrid() {
  const positionArray = pointGeometry.attributes.position.array;
  for (let i = 0; i < gs3; i++) {
    grid[i] = 1;
  }
}
createGrid();
randomize("mpltsjkm");

function mod(n, s) {
  if (n < 0) return s + n;
  return n % s;
}

function oob(x, y, z) {
  const gs = gridSize;
  return x === gs || y === gs || z === gs || x === -1 || y === -1 || z === -1;
}

function countNeighbors(a, b, c) {
  const gs = gridSize;
  if (a === gs - 1 || b === gs - 1 || c === gs - 1 || a === 0 || b === 0 || c === 0) {
    let count = 0;
    for (let x = a - 1; x < a + 2; x++) {
      for (let y = b - 1; y < b + 2; y++) {
        for (let z = c - 1; z < c + 2; z++) {
          if (x === a && y === b && z === c) continue;
          if (!config.wrap && oob(x, y, z)) continue;
          const i = mod(x, gs) + mod(y, gs) * gridSize + mod(z, gs) * gs2;
          if (grid[i] === 1) count++;
        }
      }
    }
    return count;
  } else {
    let count = 0;
    let x, y, z;
    x = a - 1, y = b, z = c; count += grid[x + y * gridSize + z * gs2];
    x = a - 1, y = b, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a - 1, y = b, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    x = a - 1, y = b - 1, z = c; count += grid[x + y * gridSize + z * gs2];
    x = a - 1, y = b - 1, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a - 1, y = b - 1, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    x = a - 1, y = b + 1, z = c; count += grid[x + y * gridSize + z * gs2];
    x = a - 1, y = b + 1, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a - 1, y = b + 1, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b, z = c; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b - 1, z = c; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b - 1, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b - 1, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b + 1, z = c; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b + 1, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a + 1, y = b + 1, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    x = a, y = b, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a, y = b, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    x = a, y = b - 1, z = c; count += grid[x + y * gridSize + z * gs2];
    x = a, y = b - 1, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a, y = b - 1, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    x = a, y = b + 1, z = c; count += grid[x + y * gridSize + z * gs2];
    x = a, y = b + 1, z = c - 1; count += grid[x + y * gridSize + z * gs2];
    x = a, y = b + 1, z = c + 1; count += grid[x + y * gridSize + z * gs2];
    return count;
  }
}

function makeSeed() {
  Math.seedrandom(Date.now());
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: 8 })
    .map((_) => chars[Math.floor(Math.random() * chars.length)])
    .join("");
}

function clear() {
  const sizeArray = pointGeometry.attributes.size.array;
  for (let i = 0; i < gs3; i++) {
    grid[i] = 0;
    sizeArray[i] = minSpriteSize;
  }
}

function randomize(seed) {
  seed = seed || makeSeed();
  Math.seedrandom(seed);
  console.log(seed);
  const sizeArray = pointGeometry.attributes.size.array;
  for (let i = 0; i < gs3; i++) {
    grid[i] = Math.random() > config.randomRatio ? 1 : 0;
    sizeArray[i] = grid[i] === 1 ? 1 : minSpriteSize;
  }
  updateGrid();
}

function updateGrid() {
  const sizeArray = pointGeometry.attributes.size.array;
  for (let i = 0; i < gs3; i++) {
    const x = i % gridSize;
    const y = ((i - x) / gridSize) % gridSize;
    const z = (i - y * gridSize - x) / gs2;
    const nc = countNeighbors(x, y, z);

    let alive = grid[i];

    if (alive === 1) {
      if (nc <= config.lonely) alive = 0;
      if (nc >= config.crowded) alive = 0;
    } else {
      if (nc === config.birth) {
        alive = 1;
      }
    }
    newGrid[i] = alive;

    if (alive === 1) {
      sizeArray[i] = 1;
    }
  }
  const temp = grid;
  grid = newGrid;
  newGrid = temp;
}

function decaySprites() {
  const sizeArray = pointGeometry.attributes.size.array;
  for (let i = 0; i < gs3; i++) {
    if (grid[i] === 0) {
      if (sizeArray[i] > minSpriteSize) {
        sizeArray[i] *= 0.9;
      }
    }
  }
}

const stats = new Stats();
stats.showPanel(0);
document.body.append(stats.dom);

let gamepads = [];
let lastUpdate = 0;
const vec = new Vector3();
function loop(time) {
  for (const gamepad of gamepads) {
    const yVal = gamepad.axes[3];
    if (yVal > 0.7) {
      gridGroup.scale.multiplyScalar(1 - 0.05);
    } else if (yVal < -0.7) {
      gridGroup.scale.multiplyScalar(1 + 0.05);
    }

    const xVal = gamepad.axes[2];
    if (xVal > 0.7) {
      if (gamepad.xPlusReleased && !config.enabled) updateGrid();
      gamepad.xPlusReleased = false;
    } else {
      gamepad.xPlusReleased = true;
    }

    if (xVal < -0.7) {
      if (gamepad.xMinusReleased) config.wrap = !config.wrap;
      gamepad.xMinusReleased = false;
    } else {
      gamepad.xMinusReleased = true;
    }

    if (gamepad.buttons[3].pressed) {
      if (gamepad.buttons[3].released) clear();
      gamepad.buttons[3].released = false;
    } else {
      gamepad.buttons[3].released = true;
    }

    if (gamepad.buttons[4].pressed) {
      if (gamepad.buttons[4].released) config.enabled = !config.enabled;
      gamepad.buttons[4].released = false;
    } else {
      gamepad.buttons[4].released = true;
    }

    if (gamepad.buttons[5].pressed) {
      if (gamepad.buttons[5].released) randomize();
      gamepad.buttons[5].released = false;
    } else {
      gamepad.buttons[5].released = true;
    }

    if (gamepad.buttons[0].pressed) {
      if (gamepad.buttons[0].released) {
        vec.copy(gamepad.controller.position);
        gridGroup.worldToLocal(vec);
        vec.addScalar(gridSize / 2 - 0.5);
        const [x, y, z] = [Math.round(vec.x), Math.round(vec.y), Math.round(vec.z)];
        if (!oob(x, y, z)) {
          const i = x + y * gridSize + z * gs2;
          grid[i] = grid[i] === 1 ? 0 : 1;
          pointGeometry.attributes.size.array[i] = grid[i] === 1 ? 1 : minSpriteSize;
        }
        gamepad.buttons[0].released = false;
      }
    } else {
      gamepad.buttons[0].released = true;
    }
  }
  pointMaterial.uniforms.scale.value = gridGroup.scale.x * config.particleSize;

  if (config.enabled && time - lastUpdate > config.delay) {
    updateGrid();
    lastUpdate = time;
  }
  decaySprites();
  pointGeometry.attributes.size.needsUpdate = true;
  helper.material.color.setHex(
    config.enabled ? (config.wrap ? 0xead800 : 0xff6500) : config.wrap ? 0x9b8f00 : 0x923a00
  );
  renderer.render(scene, camera);
  stats.update();
}

renderer.setAnimationLoop(loop);

info.appendChild(VRButton.createButton(renderer));

renderer.xr.addEventListener("sessionend", () => {
  controls.update();
});

function initController(controller) {
  scene.add(controller);

  const spriteGroup = new Group();
  spriteGroup.scale.setScalar(0.05);
  const spritePositions = [
    [0.4, 0, 0],
    [-0.4, 0, 0],
    [0, 0.4, 0],
    [0, -0.4, 0],
    [0, 0, 0.4],
    [0, 0, -0.4],
  ];
  for (const spritePosition of spritePositions) {
    const sprite = new Sprite(new SpriteMaterial({ map: pointTexture }));
    sprite.scale.setScalar(0.2);
    sprite.position.set.apply(sprite.position, spritePosition);
    spriteGroup.add(sprite);
  }
  const sprite = new Sprite(new SpriteMaterial({ color: 0xff0000, map: pointTexture }));
  sprite.scale.setScalar(0.1);
  spriteGroup.add(sprite);
  controller.add(spriteGroup);

  controller.addEventListener("squeezestart", () => controller.attach(gridGroup));
  controller.addEventListener("squeezeend", () => {
    if (gridGroup.parent === controller) scene.attach(gridGroup);
  });
  controller.addEventListener("connected", (event) => {
    event.data.gamepad.controller = controller;
    gamepads.push(event.data.gamepad);
  });
}
initController(renderer.xr.getController(0));
initController(renderer.xr.getController(1));

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);
