const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Points } = require('three');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const randomNameSelection = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett",
  "Kilo", "Lima", "Mike", "November", 
  "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey",
  "X-ray", "Yankee", "Zulu"
]

const GAMESIZE = 40 //map is 40 in +x, -x, +y, -y
let cellsize;

// make all points positive and then shift by -40, -40 afterwards
function insertPointIntoGrid(grid, point) {
  let gridx = Math.floor(point[0] / cellsize);
  let gridy = Math.floor(point[1] / cellsize);
  grid[gridx][gridy] = point;
}

function distance(x0, y0, x1, y1){
  return Math.sqrt((x1 - x0)*(x1-x0) + (y1 - y0)*(y1-y0));
}

function validPoint(grid, gsize, p, radius) {

  if (p[0] < 0 || p[0] >= GAMESIZE*2 || p[1] < 0 || p[1] >= GAMESIZE*2) {
    return false;
  }

  let xindex = Math.floor(p[0] / cellsize);
  let yindex = Math.floor(p[1] / cellsize);
  let i0 = Math.max(xindex - 1, 0);
  let i1 = Math.min(xindex + 1, gsize - 1);
  let j0 = Math.max(yindex - 1, 0);
  let j1 = Math.min(yindex + 1, gsize - 1);

  for (let i = i0; i<=i1; i++){
    for (let j = j0; j<=j1; j++){
      if (grid[i][j] !== undefined){
        if (distance(grid[i][j][0], grid[i][j][1], p[0], p[1] < radius)) return false;
      }
    }
  }

  return true;

}

function poissonDiskSampling(radius, k) {
  const final_points = [];
  const active_points = [];
  cellsize = Math.floor(radius / Math.sqrt(2));
  const gridsize = Math.ceil((2 * GAMESIZE) / cellsize) + 1;

  const grid = new Array(gridsize);
  for (let i = 0; i < gridsize; i++) {
    grid[i] = new Array(gridsize);
  }

  const p0 = [Math.random()*GAMESIZE*2,
    Math.random()*GAMESIZE*2];
  
  insertPointIntoGrid(grid, p0);
  final_points.push(p0);
  active_points.push(p0);

  while (active_points.length > 0) {
    let random_index = Math.floor(active_points.length * Math.random());
    let current_point = active_points[random_index];

    let found = false;
    for (let i = 0; i<k; i++) {

      let newAngle = Math.floor(2 * Math.PI * Math.random());
      let newRadius = Math.floor(radius * Math.random() + radius);
      let newx = current_point[0] + newRadius * Math.cos(newAngle);
      let newy = current_point[1] + newRadius * Math.sin(newAngle);
      let newPoint = [newx, newy];

      //check neighboring 8 cells
      if (!validPoint(grid, gridsize, newPoint, radius)) continue;

      final_points.push(newPoint);
      insertPointIntoGrid(grid, newPoint);
      active_points.push(newPoint);
      found = true;
      break;
      
    }
    if (!found) active_points.splice(random_index, 1);
  }

  for (let i = 0; i<final_points.length; i++) {
    final_points[i][0] -= GAMESIZE;
    final_points[i][1] -= GAMESIZE;
  }
  
  return final_points;

}


const connections = {};
const activePlayers = [];
const nameIndex = {};
const score = {};
let treePosition = poissonDiskSampling(4,30);

server.listen(8081, () => {
  console.log('listening on: *:8081');
});

io.on('connection', (socket) => {
  let newPlayerName = randomNameSelection[Math.floor(Math.random() * randomNameSelection.length)];
  while (nameIndex[newPlayerName]) {
    newPlayerName = randomNameSelection[Math.floor(Math.random() * randomNameSelection.length)];
  }
  console.log('A player joined', socket.id, "and given name", newPlayerName);
  activePlayers.push(newPlayerName);
  nameIndex[socket.id] = newPlayerName;
  socket.emit("yourName", newPlayerName);
  socket.emit("treePositions", treePosition);
  socket.emit("currentScore", score);
  score[newPlayerName] = 0;

  socket.on('clientUpdate', (data) => {
  // send this players update to all other players
  // store out latest data on this guy
    connections[socket.id] = data;
    socket.broadcast.emit('PlayerUpdate', { ...data, name: nameIndex[socket.id]});
  });

  socket.on('PlayerShooting', () => {
    socket.broadcast.emit('PlayerShooting', nameIndex[socket.id]);
    console.log(nameIndex[socket.id] + " is shooting!");
  });

  socket.on('disconnect', () => {
    const playerName = nameIndex[socket.id];
    delete score[playerName];
    console.log("player", socket.id, "with name", playerName, "left");
    connections[playerName] = null;
    nameIndex[socket.id] = null;
    activePlayers.splice(activePlayers.indexOf(playerName), 1);
    console.log(activePlayers);
    socket.broadcast.emit('PlayerDisconnect', playerName);
  });

  socket.on('PlayerShot', (name) => {
    // broadcast and kill
    const shooter = nameIndex[socket.id];
    console.log(nameIndex[socket.id], "shot", name);
    io.emit("PlayerShot", [shooter, name]); //to everyone, including the sender
    score[shooter]++;
    score[name] = 0;
  });
});
