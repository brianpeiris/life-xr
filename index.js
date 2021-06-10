import {VRButton} from "https://unpkg.com/three@0.129.0/examples/jsm/webxr/VRButton.js";

console.clear();

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
  Box3Helper,
  RepeatWrapping,
  AdditiveBlending,
} = THREE;

const gridSize = 8;
let grid = [];
let newGrid = [];

const scene = window.scene = new Scene();

const vertexShader = `
attribute float size;
attribute vec3 ca;
varying vec3 vColor;
void main() {
  vColor = ca;
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = size * ( 1000.0 / -mvPosition.z );
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform sampler2D pointTexture;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4( vColor, 1.0 ) * texture2D( pointTexture, gl_PointCoord );;
}
`;

const box = new Box3();
box.setFromCenterAndSize(new Vector3(0, 0, 0), new Vector3(gridSize, gridSize, gridSize));

const helper = new Box3Helper(box, 0x8d5400);

const config = {
  enabled: true,
  delay: 60,
  lonely: 16,
  crowded: 27,
  birth: 4,
  randomize,
  updateGrid,
};
const gui = new dat.GUI();
gui.add(config, "enabled");
gui.add(config, "delay", 0, 1000, 10);
gui.add(config, "lonely", 0, 125, 1);
gui.add(config, "crowded", 0, 125, 1);
gui.add(config, "birth", 0, 125, 1);
gui.add(config, "randomize");
gui.add(config, "updateGrid");

const light = new DirectionalLight();
light.position.set(1, 2, 3);
scene.add(light);

scene.add(new AmbientLight(0xaaaaaa));

const camera = new PerspectiveCamera();
camera.position.z = gridSize * 2;

const renderer = new WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
document.body.append(renderer.domElement);
new OrbitControls(camera, renderer.domElement);

const gridGroup = new Group();
gridGroup.add(helper);
scene.add(gridGroup);

const pointTexture = new TextureLoader().load("sprite.png");
pointTexture.wrapS = RepeatWrapping;
pointTexture.wrapT = RepeatWrapping;
const pointMaterial = new ShaderMaterial({
  uniforms: {
    pointTexture: { value: pointTexture }
  },
  vertexShader,
  fragmentShader,
  alphaTest: 0.5,
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: AdditiveBlending,
});

const pointPositions = [];
const pointSizes = [];
const pointColors = [];

for (let i = 0; i < gridSize ** 3 * 3; i++) {
  pointPositions.push(i, 0, 0);
  pointSizes.push(1);
  pointColors.push(1, 1, 1);
}

const pointGeometry = window.pointGeometry = new THREE.BufferGeometry();
pointGeometry.setAttribute("position", new Float32BufferAttribute(pointPositions, 3));
pointGeometry.setAttribute("size", new Float32BufferAttribute(pointSizes, 1));
pointGeometry.setAttribute("ca", new Float32BufferAttribute(pointColors, 3));

const points = new THREE.Points(pointGeometry, pointMaterial);
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
randomize();

function mod(n, s) {
  if (n < 0) return s + n;
  return n % s;
}

function countNeighbors(a, b, c) {
  const gs = gridSize;
  let count = 0;
  for (let x = a - 1; x < a + 2; x++) {
    for (let y = b - 1; y < b + 2; y++) {
      for (let z = c - 1; z < c + 2; z++) {
        if (x === a && y === b && z === c) continue;
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

function randomize() {
  const seed = makeSeed();
  //const seed = "bdyrwfow"
  //const seed = "uvaagdsg";
  //const seed = "aqjeddya";
  //const seed = "clrwhlee";
  Math.seedrandom(seed);
  console.log(seed);
  const sizeArray = pointGeometry.attributes.size.array;
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        grid[x][y][z] = Math.random() > 0.95;
        const index = x + y * gridSize + z * gridSize ** 2;
        sizeArray[index] = grid[x][y][z] ? 1 : 0.00001;
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
          if (sizeArray[index] > 0.00001) {
            sizeArray[index] *= 0.95;
          }
        }
      }
    }
  }
  pointGeometry.attributes.size.needsUpdate = true;
  pointGeometry.attributes.ca.needsUpdate = true;
}

const stats = new Stats();
stats.showPanel(0);
document.body.append(stats.dom);

let gamepad = null;
let lastUpdate = 0;
function loop(time) {
  if (gamepad) {
    const stickVal = gamepad.axes[3];
    if (stickVal > 0.5) {
      gridGroup.scale.multiplyScalar(1 - 0.05);
    }
    else if (stickVal < -0.5) {
      gridGroup.scale.multiplyScalar(1 + 0.05);
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
document.body.appendChild( VRButton.createButton( renderer ) );

function makeCube() {
  return new Mesh(
    new BoxGeometry(0.05, 0.05, 0.05),
    new MeshStandardMaterial({color: 'grey'})
  );
}
const controllerA = renderer.xr.getControllerGrip(0);
const controllerB = renderer.xr.getControllerGrip(1);
scene.add(controllerA);
scene.add(controllerB);
controllerA.add(makeCube());
controllerB.add(makeCube());
controllerA.addEventListener("select", randomize);
controllerA.addEventListener("squeezestart", () => {
  controllerA.attach(gridGroup);
});
controllerA.addEventListener("squeezeend", () => {
  scene.attach(gridGroup);
});
controllerA.addEventListener("connected", ({data}) => {
  window.gamepad = gamepad = data.gamepad;
});

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);
