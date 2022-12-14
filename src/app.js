const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const randomNameSelection = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett",
  "Kilo", "Lima", "Mike", "November", 
  "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey",
  "X-ray", "Yankee", "Zulu"
]

const connections = {};
const activePlayers = [];
const nameIndex = {};
const score = {};
let treePosition = [
  [0,0], [10, 10], [32, 5], [16,3], [-10, -4], [14, -16],
  [12, 24], [-17, 20], [-10, -4], [13, -9], [10, 13],
  [1,4], [40, 9], [16, 29], [-23, 10], [-5, 2], [10, -11]];

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

  socket.on("PlayerShot", (name) => {
    // broadcast and kill
    const shooter = nameIndex[socket.id];
    console.log(nameIndex[socket.id], "shot", name);
    io.emit("PlayerShot", [shooter, name]); //to everyone, including the sender
    score[shooter]++;
    score[name] = 0;
  });
});