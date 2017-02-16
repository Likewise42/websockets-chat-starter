const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read client into memory
const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

// pass int he http server to socketio and grab the websocker server as io
const io = socketio(app);

// objsect to store all users
const users = {};

const nameValid = (sock) => {
  const socket = sock;
  // check if name alreay in use
  let uName = true;
  let nameChanged = false;
  let nextUserNum = 0;
  const originalName = socket.name;
  do {
    if (users[socket.name]) {
      uName = false;
      nameChanged = true;
      nextUserNum++;
      socket.name = originalName + nextUserNum;
    } else {
      uName = true;
    }
  } while (!uName);
  if (nameChanged) {
    socket.emit('msg', { name: 'server', msg: `Your name was not unique and was changed to ${socket.name}.` });
  }
};

// delegate fucntions
const onJoined = (sock) => {
  const socket = sock;
  socket.on('join', (data) => {
    // message back to new user
    const joinMsg = {
      name: 'server',
      msg: `There are ${Object.keys(users).length} other users online`,
    };

    socket.name = data.name;
    socket.emit('msg', joinMsg);

    nameValid(socket);

    users[socket.name] = socket;

    socket.join('room1');

    // announcemnt
    const response = {
      name: 'server',
      msg: `${socket.name} has joined the room.`,
    };
    socket.broadcast.to('room1').emit('msg', response);


    console.log(`${socket.name} joined`);

    // success message backto the server
    socket.emit('msg', { name: 'server', msg: 'You joined the room' });
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('changeName', (data) => {
    const oldName = socket.name;
    socket.name = data.newName;
    nameValid(socket);
    io.sockets.in('room1').emit('msg', { name: 'server', msg: `User ${oldName} has changed their name to ${socket.name}` });
  });

  socket.on('msgToServer', (data) => {
    io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    delete users[socket.name];
    io.sockets.in('room1').emit('msg', { name: 'server', msg: `User ${socket.name} disconnected` });
    console.log(`disconnect detected from: ${socket.name}. ${Object.keys(users).length} users remain.`);
  });
};


io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
