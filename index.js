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
let grid = [];
let newGrid = [];

const scene = new Scene();

const vertexShader = `
uniform float scale;
attribute float size;
varying float dis;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = scale * 1.0 * size * ( 100.0 / -mvPosition.z );
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
pointMaterial.uniforms.scale.value = gridGroup.scale.x * 5;

const pointPositions = [];
const pointSizes = [];

for (let i = 0; i < gridSize ** 3 * 3; i++) {
  pointPositions.push(i, 0, 0);
  pointSizes.push(1);
}

const pointGeometry = new BufferGeometry();
pointGeometry.setAttribute("position", new Float32BufferAttribute(pointPositions, 3));
pointGeometry.setAttribute("size", new Float32BufferAttribute(pointSizes, 1));

const points = new Points(pointGeometry, pointMaterial);
gridGroup.add(points);

function createGrid() {
  const positionArray = pointGeometry.attributes.position.array;
  for (let x = 0; x < gridSize; x++) {
    if (!grid[x]) grid[x] = [];
    if (!newGrid[x]) newGrid[x] = [];
    for (let y = 0; y < gridSize; y++) {
      if (!grid[x][y]) grid[x][y] = [];
      if (!newGrid[x][y]) newGrid[x][y] = [];
      for (let z = 0; z < gridSize; z++) {
        grid[x][y][z] = true;
        const index = x * 3 + y * gridSize * 3 + z * gridSize ** 2 * 3;
        positionArray[index + 0] = x - gridSize / 2 + 0.5;
        positionArray[index + 1] = y - gridSize / 2 + 0.5;
        positionArray[index + 2] = z - gridSize / 2 + 0.5;
      }
    }
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
  return x >= gs || y >= gs || z >= gs || x < 0 || y < 0 || z < 0;
}

function countNeighbors(a, b, c) {
  const gs = gridSize;
  let count = 0;
  for (let x = a - 1; x < a + 2; x++) {
    for (let y = b - 1; y < b + 2; y++) {
      for (let z = c - 1; z < c + 2; z++) {
        if (x === a && y === b && z === c) continue;
        if (!config.wrap && oob(x, y, z)) continue;
        if (grid[mod(x, gs)][mod(y, gs)][mod(z, gs)]) count++;
      }
    }
  }
  return count;
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
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        grid[x][y][z] = false;
        const index = x + y * gridSize + z * gridSize ** 2;
        sizeArray[index] = minSpriteSize;
      }
    }
  }
}

function randomize(seed) {
  seed = seed || makeSeed();
  Math.seedrandom(seed);
  console.log(seed);
  const sizeArray = pointGeometry.attributes.size.array;
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        grid[x][y][z] = Math.random() > 0.98;
        const index = x + y * gridSize + z * gridSize ** 2;
        sizeArray[index] = grid[x][y][z] ? 1 : minSpriteSize;
      }
    }
  }
  updateGrid();
}

function updateGrid() {
  const sizeArray = pointGeometry.attributes.size.array;
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const nc = countNeighbors(x, y, z);

        let alive = grid[x][y][z];

        if (alive) {
          if (nc <= config.lonely) alive = false;
          if (nc >= config.crowded) alive = false;
        } else {
          if (nc === config.birth) {
            alive = true;
          }
        }
        newGrid[x][y][z] = alive;

        if (alive) {
          const index = x + y * gridSize + z * gridSize ** 2;
          sizeArray[index] = 1;
        }
      }
    }
  }
  const temp = grid;
  grid = newGrid;
  newGrid = temp;
}

function decaySprites() {
  const sizeArray = pointGeometry.attributes.size.array;
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        if (!grid[x][y][z]) {
          const index = x + y * gridSize + z * gridSize ** 2;
          if (sizeArray[index] > minSpriteSize) {
            sizeArray[index] *= 0.9;
          }
        }
      }
    }
  }
  pointGeometry.attributes.size.needsUpdate = true;
}

const stats = new Stats();
stats.showPanel(0);
document.body.append(stats.dom);

let gamepads = [];
let lastUpdate = 0;
let lastTriggerPress = 0;
const vec = new Vector3();
function loop(time) {
  for (const gamepad of gamepads) {
    const stickVal = gamepad.axes[3];
    if (stickVal > 0.5) {
      gridGroup.scale.multiplyScalar(1 - 0.05);
    } else if (stickVal < -0.5) {
      gridGroup.scale.multiplyScalar(1 + 0.05);
    }
    pointMaterial.uniforms.scale.value = gridGroup.scale.x * 5;

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
      if (Date.now() - lastTriggerPress > 150) {
        lastTriggerPress = Date.now();
        vec.copy(gamepad.controller.position);
        gridGroup.worldToLocal(vec);
        vec.addScalar(gridSize / 2 - 0.5);
        const [x, y, z] = [Math.round(vec.x), Math.round(vec.y), Math.round(vec.z)];
        if (!oob(x, y, z)) {
          grid[x][y][z] = !grid[x][y][z];
          const index = x + y * gridSize + z * gridSize ** 2;
          pointGeometry.attributes.size.array[index] = grid[x][y][z] ? 1 : minSpriteSize;
        }
      }
    }
  }
  if (config.enabled && time - lastUpdate > config.delay) {
    updateGrid();
    lastUpdate = time;
  }
  decaySprites();
  renderer.render(scene, camera);
  stats.update();
}

renderer.setAnimationLoop(loop);

document.body.appendChild(VRButton.createButton(renderer));

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
