MODULE_DIR = './lib/node_modules/';
REDIS_HOST = '127.0.0.1';
REDIS_PORT = '6379';
HTTP_PORT  = 8080;

var fs = require('fs');
var http = require('http');
var express = require(MODULE_DIR + 'express');
var socketio = require(MODULE_DIR + 'socket.io');
var kinda_ntp = require(MODULE_DIR + 'socket-kinda-ntp');
var redis = require(MODULE_DIR + 'redis');

var server_port = HTTP_PORT;
var control_password = "crowd-control";
var redis_scene_key = "json-scenes";
var redis_channel = "scene-updates";

// This cannot be the correct way of doing things...
var my_random = Math.floor((Math.random()*10000)+1);

var app = express();
var redis_publisher = redis.createClient(REDIS_PORT, REDIS_HOST);
var redis_subscriber = redis.createClient(REDIS_PORT, REDIS_HOST);
var scenes = {};

// HTTP get requests handlers.
app.use(express.static(__dirname));
app.get('/', function(request, response) {
  response.writeHead(200, { 'Content-type': 'text/html'});
  response.end(fs.readFileSync('device.html'));
});
app.get('/control', function(request, response) {
  response.writeHead(200, { 'Content-type': 'text/html'});
  response.end(fs.readFileSync('control.html'));
});

// Sart the HTTP server.
var server = http.createServer(app).listen(server_port, function() {
  console.log('Listening at: http://localhost:' + server_port);
});

// Subscribe to scene updates, load scenes into memory.
redis_subscriber.subscribe(redis_channel);
redis_publisher.get(redis_scene_key, function (err, reply) {
  if(reply != null)
    scenes = JSON.parse(reply);
});

// Start the socket server.
var io = socketio.listen(server);
io.on('connection', function(socket) {
  kinda_ntp.init(socket);
  
  socket.on('authenticate', function(password) {
    if(password == control_password)
      socket.join('control');
  }); 
  
  socket.on('get_time', function() {
    socket.emit('time', new Date().getTime());
  });
  
  socket.on('get_scenes', function() {
    for(var scene in scenes)
      socket.emit('add_scene', scenes[scene]);
  });
  
  socket.on('add_frame', function(newFrame) {
    io.sockets.in('control').emit('add_frame', newFrame);
    redis_publisher.publish(redis_channel, JSON.stringify({"msg": "add_frame", "random": my_random, "frame": newFrame}));
  });
  
  socket.on('add_scene', function(scene) {
    if(io.sockets.manager.roomClients[socket.id]['/control'] != null) {
      scenes[scene.name] = scene;
      redis_publisher.set(redis_scene_key, JSON.stringify(scenes), redis.print);
      socket.broadcast.emit('add_scene', scene);
      console.log("Added scene: " + scene.name);
      redis_publisher.publish(redis_channel, JSON.stringify({"msg": "add_scene", "random": my_random, "scene": scene}));
    }
    else
      console.log("Client calling add_scene() not in /control?!");
  });
  
  socket.on('delete_scene', function(scene_name) {
    if(io.sockets.manager.roomClients[socket.id]['/control'] != null) {
      delete scenes[scene_name];
      redis_publisher.set(redis_scene_key, JSON.stringify(scenes), redis.print);
      socket.broadcast.emit('delete_scene', scene_name);
      console.log("Deleted scene: " + scene_name);
      redis_publisher.publish(redis_channel, JSON.stringify({"msg": "delete_scene", "random": my_random, "scene_name": scene_name}));
    }
    else
      console.log("Client calling delete_scene() not in /control?!");
  });
  
  socket.on('play_scene', function(scene) {
    if(io.sockets.manager.roomClients[socket.id]['/control'] != null) {
      socket.broadcast.emit('play_scene', scene);
      console.log("Play scene: " + scene.name);
      redis_publisher.publish(redis_channel, JSON.stringify({"msg": "play_scene", "random": my_random, "scene": scene}));
    }
    else
      console.log("Client calling play_scene() not in /control?!");
  });
  
  socket.on('disconnect', function() {
    socket.leave('control');
    console.log("Socket disconnected.");
  });
});

// Process scene updates and scene plays.
redis_subscriber.on('message', function(channel, raw_data) {
  data = JSON.parse(raw_data);
  
  // Don't respond to our own pubs, should be doing this differently.
  if(data.random == my_random)
    return;
  
  // Update available scenes.
  redis_publisher.get(redis_scene_key, function (err, reply) {
    if(reply != null)
      scenes = JSON.parse(reply);
  });
  
  if(data.msg == "add_frame")
    io.sockets.in('control').emit('add_frame', data.frame);
  
  else if(data.msg == "add_scene") {
    io.sockets.emit('add_scene', data.scene);
    console.log("Added scene: " + data.scene.name);
  }
  
  else if(data.msg == "delete_scene") {
    io.sockets.emit('delete_scene', data.scene_name);
    console.log("Deleted scene: " + data.scene_name);
  }
  
  else if(data.msg == "play_scene") {
    io.sockets.emit('play_scene', data.scene);
    console.log("Play scene: " + data.scene.name);
  }
});