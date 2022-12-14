import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import socketClient from 'socket.io-client';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import SKYBOXLOCATIONpx from '../skyboxes/Clear/vz_clear_right.png';
import SKYBOXLOCATIONnx from '../skyboxes/Clear/vz_clear_left.png';
import SKYBOXLOCATIONpy from '../skyboxes/Clear/vz_clear_up.png';
import SKYBOXLOCATIONny from '../skyboxes/Clear/vz_clear_down.png';
import SKYBOXLOCATIONpz from '../skyboxes/Clear/vz_clear_front.png';
import SKYBOXLOCATIONnz from '../skyboxes/Clear/vz_clear_back.png';
import TREEMODEL from '../Tree.glb';
import TANKMODEL from '../tank.glb';
import GRASSTEXTURE from '../grasstexture.png';

//connect!
const ENDPOINT = 'http://34.130.255.101:8081';
const SOCKET = socketClient(ENDPOINT);

function sendUpdate(myself) {
  const data = { position: myself.position, direction: myself.direction };
  SOCKET.emit('clientUpdate', data);
}

let _doneLoading = false;
let score = {};
score["Local_Player"] = 0;

// add a new player to the scene
function addPlayer(p, n, s) {
  let playerColor = p[n].color;
  if (playerColor === undefined) playerColor = 0x00ff00;
  const mesh = new THREE.Object3D().copy(_tankModel);
  mesh.traverse((object) => {
    object.name = n;
  });
  mesh.position.copy(p[n].position);
  mesh.name = n;
  mesh.rotation.copy(new THREE.Euler(0, p[n].direction, 0));
  s.add(mesh);
  p[n].object = mesh;
}

let trees = [];
let _treeModel;

// add tree
function addTree(x, z, s) {
  const newTree = new THREE.Object3D().copy(_treeModel);
  newTree.traverse((object) => {
    object.name = "Tree";
  });
  newTree.scale.multiplyScalar(0.4);
  newTree.position.set(x, 0, z);
  trees.push([x, z]);
  s.add(newTree);
}

// update a player who has already been added
function updatePlayer(p, n) {
  p[n].object.position.copy(p[n].position);
  p[n].object.rotation.copy(new THREE.Euler(0, p[n].direction, 0));
}

// set up a renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.style.margin = 0;
document.body.style.overflow = 'hidden';

// add static image (crosshair)
/*
const crossHair = new Image();
crossHair.src = CROSSHAIRIMAGE;
document.body.appendChild(crossHair);
crossHair.style.position = 'fixed';
crossHair.style.left = '50%';
crossHair.style.top = '50%';
crossHair.style.marginLeft = '-32px';
crossHair.style.marginTop = '-32px';
*/

// create the hud
const hud = document.createElement("div");
hud.style.position = "fixed";
hud.style.right = "2%";
hud.style.top = "3%"
hud.style.width = "15%";
hud.style.backgroundColor = "gray";
hud.style.border = "1px solid black";
const whoami = document.createElement("p");
whoami.innerText = "not yet connected";
whoami.style.fontSize = "32px";
whoami.style.textAlign = "center";
hud.appendChild(whoami);
const enemies = document.createElement("p");
enemies.innerHTML = "Scoreboard:"
enemies.style.fontSize = "28px";
enemies.style.textAlign = "center";
hud.appendChild(enemies);
document.body.appendChild(hud);

// game notifications
const notif = document.createElement("p");
notif.style.position = "fixed";
notif.style.right = "20%";
notif.style.top = "10%";
notif.innerHTML = "";
notif.style.fontSize = "40px";
notif.style.fontWeight = "bold";
notif.style.textAlign = "right";
document.body.appendChild(notif);

// reload hud element
const reloadtext = document.createElement("p");
reloadtext.style.position = "fixed";
reloadtext.style.textAlign = "right";
reloadtext.style.right = "20%";
reloadtext.style.top = "0%";
reloadtext.style.color = "green";
reloadtext.style.fontSize = "50px";
reloadtext.style.fontWeight = "bold";
reloadtext.innerHTML = "Laser READY";
reloadtext.style.backdropFilter = "blur(5px)";
reloadtext.style.borderRadius = "20px";
reloadtext.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
reloadtext.style.padding = "10px";
document.body.appendChild(reloadtext);

// set up a camera
const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 100);
camera.position.z = -10;
camera.position.y = 10;
camera.lookAt(new THREE.Vector3(0,0,0));
let cameraYaw = 0; // amount we look up = rotate camera by perp axis, radians

// set up orbit controls for debugging
/*
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
*/

// set up a light
const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
const light2 = new THREE.PointLight( 0xffffff, 1, 0 );
light2.position.set(0, 100, 0);

// set up a scene and give it a skybox
const loader = new THREE.CubeTextureLoader();
const textureCube = loader.load([
  SKYBOXLOCATIONpx, SKYBOXLOCATIONnx,
  SKYBOXLOCATIONpy, SKYBOXLOCATIONny,
  SKYBOXLOCATIONpz, SKYBOXLOCATIONnz,
]);
const scene = new THREE.Scene();
scene.background = textureCube;
scene.add(light);
scene.add(light2);
// add axes helpers
scene.add(new THREE.AxesHelper(5));

// the plane of exsistence
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load(GRASSTEXTURE);
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(10, 10);
console.log(grassTexture);
const planeGeometry = new THREE.PlaneGeometry(130,130);
const planeMaterial = new THREE.MeshBasicMaterial({ map: grassTexture, side: THREE.DoubleSide});
const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
planeMesh.lookAt(0, 10, 0);
scene.add(planeMesh);

// add stats to the screen
const stats = Stats();
document.body.appendChild(stats.dom);

const gltfLoader = new GLTFLoader();
let _tankModel;
// load the characters
gltfLoader.load(
  TANKMODEL,
  (tankGLTF) => {
    _tankModel = tankGLTF.scene;
    console.log(tankGLTF);
    gltfLoader.load(
      TREEMODEL, 
      (treeGLFT => {
        _treeModel = treeGLFT.scene;
        console.log(treeGLFT);
        loadingProgress++;
        checkLoading();
      })
    )
  }
);

// server will send update of player objects with name, posisition, and direction vector
// we send our location and direction too, every tick
// whenever we get one, we update that players position in the our world
// when a new player joins we need to make that players object

function updateScoreboard() {
  enemies.innerHTML = "Scoreboard:<br>";
  for (let k in players) {
    if (k === 'Local_Player') enemies.innerHTML += _myName + ": " + score[k] + "<br>";
    else enemies.innerHTML += k + ": " + score[k] + "<br>";
  }
}

let treePositions;
const SPEED = 0.1;
const keyMap = new Map();
const players = {};
let _myName;
const notifqueue = [];

function clearNotif() {
  notif.innerHTML = "";
  runNotif();
}

function runNotif() {
  // already a notification displaying, we will be called once it gets cleared
  if (!notif.innerHTML) {
    if (notifqueue.length === 0) return; // no notifications to display right now
    notif.innerHTML = notifqueue.shift(); // remove the first element and get it
    window.setTimeout(clearNotif, 1500);
  }
}

// code for updating players
SOCKET.on('PlayerUpdate', (msg) => {
  if (!_doneLoading) return;
  if (players[msg.name] === undefined) {
    players[msg.name] = msg;
    //make a new player with this
    addPlayer(players, msg.name, scene);
    if (score[msg.name] === undefined) score[msg.name] = 0;
    //update the scoreboard
    updateScoreboard();
    //make a notification
    notifqueue.push(msg.name + " joined!");
    runNotif();
  } else {
    players[msg.name].direction = msg.direction;
    players[msg.name].position = msg.position;
  }
  updatePlayer(players, msg.name);
});

SOCKET.on("yourName", (name) => {
  _myName = name;
  whoami.innerHTML = "You are: " + _myName;
  updateScoreboard();
  console.log(name);
});

SOCKET.on("PlayerDisconnect", (name) => {
  scene.remove(players[name].object);
  delete players[name];
  delete score[name];
  notifqueue.push(name + " left.");
  runNotif();
  updateScoreboard();
});

SOCKET.on("PlayerShooting", (name) => {
  renderLaser(players, name);
});

SOCKET.on("PlayerShot", (names) => {
  notifqueue.push(names[0] + " killed " + names[1]);
  runNotif();
  if (_myName === names[0]) score['Local_Player']++;
  else score[names[0]]++;
  // was it me who died
  if (_myName == names[1]) {
    spawnPlayer();
    score['Local_Player'] = 0;
  } else {
    score[names[1]] = 0;
  }
  updateScoreboard();
});

SOCKET.on("currentScore", (serverScores) => {
  score = {...score, ...serverScores};
  loadingProgress++;
  checkLoading();
});

SOCKET.on("treePositions", (treePos) => {
  treePositions = treePos;
  loadingProgress++;
  checkLoading();
});

document.onkeydown = function (e) {
  keyMap.set(e.key, true);
};

document.onkeyup = function (e) {
  keyMap.set(e.key, false);
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max-min)) + min;
}

function spawnPlayer() {
  players['Local_Player'].position.set(getRandomInt(-30, 30), 0.31, getRandomInt(-30, 30));
  players['Local_Player'].position.add(new THREE.Vector3(0.5, 0, 0.5));
  console.log(players['Local_Player'].position);
}

let loadingProgress = 0;

function checkLoading() {
  console.log("checkloading", loadingProgress);
  if (loadingProgress === 3) {
    doneLoading();
    console.log("done loading");
  }
}

function doneLoading() {
  _doneLoading = true;
  // position is game world posiiton, and direction is angle of rotation with respect to z axis
  players['Local_Player'] = { position: new THREE.Vector3(0, 100, 0), direction: 0, color: 0xff0000};
  // hide you in the sky
  addPlayer(players, 'Local_Player', scene);
  for (const x of treePositions) addTree(x[0], x[1], scene);
  renderer.setAnimationLoop(render);
  //actually spawn you on the ground
  spawnPlayer();
  updateScoreboard();
}

let reloading = false;
const LASER_RANGE = 15;

const lasermaterial = new THREE.LineBasicMaterial( {color: 0xff0000, linewidth: 4} );
function renderLaser(p, n) {
  const tankPosition = new THREE.Vector3(p[n].position.x, p[n].position.y, p[n].position.z);
  tankPosition.add(new THREE.Vector3(0,0.22,0));
  const upVector = new THREE.Vector3(0,1,0);
  const zVector = new THREE.Vector3(0,0,1);
  const targetPosition = tankPosition.clone().add(zVector.applyAxisAngle(upVector, p[n].direction)
    .multiplyScalar(LASER_RANGE));
  const geometry = new THREE.BufferGeometry().setFromPoints([tankPosition, targetPosition]);
  const line = new THREE.Line(geometry, lasermaterial);
  scene.add(line);
  window.setTimeout((toRemove) => {scene.remove(toRemove); }, 100, line);
  return [tankPosition, targetPosition, line];
}

function shootLaser() {
  SOCKET.emit("PlayerShooting");
  const positions = renderLaser(players, 'Local_Player');
  reloading = true;
  reloadtext.innerHTML = "Laser DOWN";
  reloadtext.style.color = "red";
  window.setTimeout(()=>{reloading = false; reloadtext.innerHTML = "Laser READY";
    reloadtext.style.color = "darkgreen"}, 2000);
  // check whether you hit anyone haiyaaaa this is so much work
  const raycaster = new THREE.Raycaster(positions[0], positions[1].sub(positions[0]).normalize(), 0, LASER_RANGE);
  const sceneObjects = [...scene.children];
  sceneObjects.splice(sceneObjects.indexOf(players['Local_Player'].object), 1);
  sceneObjects.splice(sceneObjects.indexOf(positions[2]), 1);
  const intersects = raycaster.intersectObjects(sceneObjects, true);
  const alreadyKilled = {};
  for (const intersection of intersects) {
    let intersectName = intersection.object.name;
    if (intersectName === "Tree") break; // trees are strong
    if (players[intersectName] && !alreadyKilled[intersectName]) {
      SOCKET.emit("PlayerShot", intersectName);
      alreadyKilled[intersectName] = true;
    }
  }
  
}

function render( time ) {
  const me = players['Local_Player'];

  // update player position by movement
  const moveForward = me.object.getWorldDirection(new THREE.Vector3()).clone().normalize().multiplyScalar(SPEED);
  const moveRight = moveForward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(SPEED);
  if (keyMap.get('a')) me.position.sub(moveRight);
  if (keyMap.get('d')) me.position.add(moveRight);
  if (keyMap.get('w')) me.position.add(moveForward);
  if (keyMap.get('s')) me.position.sub(moveForward);
  if (keyMap.get('ArrowUp')) if (!reloading) shootLaser();
  if (keyMap.get('ArrowRight')) players['Local_Player'].direction -= 0.03;
  if (keyMap.get('ArrowLeft')) players['Local_Player'].direction += 0.03;
  
  //make sure my tank doesn't leave map
  if (me.position.x > 40) me.position.x = 40;
  if (me.position.x < -40) me.position.x = -40;
  if (me.position.z < -40) me.position.z = -40;
  if (me.position.z > 40) me.position.z = 40;
  

  // make sure my tank doesn't go into any trees
  for (let i = 0; i<trees.length; i++) {
    let tree = trees[i];
    let treePosition = new THREE.Vector2(tree[0], tree[1]);
    let tankPosition = new THREE.Vector2(me.position.x, me.position.z);
    let deltaPosition = tankPosition.clone().sub(treePosition);
    if (deltaPosition.length() < 1.1) {
      // collision
      tankPosition.copy(treePosition).add(deltaPosition.normalize().multiplyScalar(1.11));
      me.position.x = tankPosition.x;
      me.position.z = tankPosition.y;
    }
  }

  /* mouse based controls
  cameraYaw %= 2 * Math.PI;
  cameraYaw -= (mouseYDelta / 500) * 2;
  players['Local_Player'].direction -= (msouseXDelta / 4000) * 6.28;
  players['Local_Player'].direction %= 2 * Math.PI;

  if (cameraYaw > 45 * (Math.PI / 180)) cameraYaw = 45 * (Math.PI / 180);
  if (cameraYaw < -45 * (Math.PI / 180)) cameraYaw = -45 * (Math.PI / 180);
  mouseXDelta = 0;
  mouseYDelta = 0;
  */

  updatePlayer(players, 'Local_Player');
  sendUpdate(me);

  camera.position.copy(me.position).add(moveForward);
  camera.position.add(new THREE.Vector3(0,0.4,0));
  camera.lookAt(camera.position.clone().add(moveForward));

  //controls.update();
  renderer.render(scene, camera);
  stats.update();
}