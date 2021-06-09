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
  OrbitControls,
  TextureLoader,
  Sprite,
  SpriteMaterial,
  Box3,
  Vector3,
  Box3Helper,
} = THREE;

const gridSize = 32;
let grid = [];
let newGrid = [];
let boxes = [];

const scene = new Scene();

const box = new Box3();
box.setFromCenterAndSize(new Vector3(0, 0, 0), new Vector3(gridSize, gridSize, gridSize));

const helper = new Box3Helper(box, 0x8d5400);

const config = {
  enabled: false,
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

const map = new TextureLoader().load(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIBAMAAABfdrOtAAAAG1BMVEX/AAD/FwD/IAD/HgD7LAv9RBr9ZSv+lUL/zIC02qZaAAAACXRSTlMCCxgrRWyf0/bQxSmXAAADoElEQVR42u2bjZHaMBCFcQe2O8DXAUcHuXQAdADpAF8HUHZycyRP3iein2Vn1jN6DXzz7cpgS6tNS0tLS0tLi/sMw9Bv7NINi9goLGIh1EMjlOktLCxswDCkAGGN6YZETD3gomfYU/pBZBqnadxKiIrSLQFhliA9gxGM0TMYwRg1hBlMUS+scXoa5RLriBGNzoUZ8WhUOmIkKfUiUzrbWpW4x9v7I+RSQ+lijPcwuxilToQtEEXBSIQ0IMMqChEwiFKpApGRSkUhl2IRZnCkS18swgxOlQog3I7/NmZbBoGI9Nh/PBJzQb2qRIBAFCosIhEIKKRSKPLGDKaQSqXIRyw/qlQAIUYOZZsPYREwmMIqfZkIM5hSqMKQt0jPfx6Pse4TJHttgQHCd4iyo/WVhIyhSIhAZMHC9VVcLYgclzlAhepVKQINpFqFRcCgRFXSJtT2PdeKKyZan6JQtQSDKShY7vPY0fpFsaIBZKlSBNkTI0qpgFC1jsjlK+ewYFAhSKIlcZHT5V+iKumm4CkhETCQmAogQ3a1IAIGQiqoVwUE3VjmDJUiiGgJRODBLqhX0JSsvkMEDIpQyet8UC0pwgQUDCoZP19dFAIRznPIkAFBS6TIPM9XoXJAUwDJbQmL/JofIZXspnR4FAUEDFACFbGIYZKGoFonMCRF1CsNEX0nkTnMVajkLq+g7wwBAxSG7Aohe1QLxQoj65WEoCUEYRFWAQRNKew7RJYBBJ0vgXBLZs4VTcmGDE8gpyXkJur1DNKn+i4hqNbn/U8W9cpcXgzhvoMRUK7UeR0EDFBeBJHVuv/NTdTrNRCIfEcHiS8uiCxUrtz5VUA+70EUkJEhlxTkTJBJAbmHuVVBuiflwuJiyMwQvEpk/j4e8yGHhUmDrA1isLrsnxP7J17/27XqX+EsiKt/xsL/+NW8rWjeu+zfIBXvwkjqXdjurd7Z98lLvrQMvxm9ff0afMfb7EgY76042SUy2O+y3rmz34O030013hd2s8NtsFdveOpgf35idhLk9EzL4HTO4JzR/sTU+OzX1yn2C87j7ScLXMxIvGTaw8fcimoCx+EskWoqyst8l3pSzc/MnXJ60NMcpGqi09VsqmbK1tm8cP3ks7sZ7tppdIdz9XU3BHzedai4teH1/knxTRq/d4LKbje5vqdVcOPM/d25ryXm5K5hv46bmUmXfj23ZUHh9Gu7wRy16dd6qzy8H9/S0tLS0tLSstlsfgOCM7yToy2OAgAAAABJRU5ErkJggg=="
);

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

function createGrid() {
  //const geo = new BoxGeometry(0.6, 0.6, 0.6);
  //const mat = new MeshStandardMaterial();

  for (let x = 0; x < gridSize; x++) {
    if (!grid[x]) grid[x] = [];
    if (!newGrid[x]) newGrid[x] = [];
    if (!boxes[x]) boxes[x] = [];
    for (let y = 0; y < gridSize; y++) {
      if (!grid[x][y]) grid[x][y] = [];
      if (!newGrid[x][y]) newGrid[x][y] = [];
      if (!boxes[x][y]) boxes[x][y] = [];
      for (let z = 0; z < gridSize; z++) {
        const box = new Sprite(new SpriteMaterial({ map: map }));
        grid[x][y][z] = true;
        boxes[x][y][z] = box;
        box.visible = grid[x][y][z];
        box.position.set(x - gridSize / 2 + 0.5, y - gridSize / 2 + 0.5, z - gridSize / 2 + 0.5);
        gridGroup.add(box);
      }
    }
  }
  randomize();
}
createGrid();
updateGrid();

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
  //const seed = makeSeed();
  //const seed = "bdyrwfow"
  //const seed = "uvaagdsg";
  //const seed = "aqjeddya";
  const seed = "clrwhlee";
  Math.seedrandom(seed);
  console.log(seed);
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        grid[x][y][z] = Math.random() > 0.5;
      }
    }
  }
}

function updateGrid() {
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
          boxes[x][y][z].scale.setScalar(1);
          boxes[x][y][z].material.color.g = 1;
        }
        boxes[x][y][z].userData.dead = !alive;
      }
    }
  }
  const temp = grid;
  grid = newGrid;
  newGrid = temp;
}

function decaySprites() {
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const box = boxes[x][y][z];
        if (box.userData.dead && box.scale.x > 0.00001) {
          box.scale.setScalar(box.scale.x * 0.90);
          box.material.color.g = box.scale.x;
        }
      }
    }
  }
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
