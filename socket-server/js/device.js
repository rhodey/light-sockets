$(function() {
  var iosocket = io.connect();
  var last_timer;
  var scenes = new Array();
  var current_frame = 0;
  var currentScene = {
    "name":"temp frame",
    "start_time":0,
    "frames":new Array()
  };
  
  // Recursively iterate through scenes.
  function next_frame() {
    if(current_frame < currentScene.frames.length) {
      $('body').css('background-color', currentScene.frames[current_frame].color);
      currentScene.start_time += currentScene.frames[current_frame].duration;
      last_timer = setTimeout(function() {
        next_frame();
      }, currentScene.start_time - kinda_ntp.time());
      current_frame++;
    }
  }
  
  iosocket.on('connect', function () {
    $('#messages').append($('<li>Connected</li>'));
    
    // Syncronize with the server.
    iosocket.emit('get_scenes');
    kinda_ntp.init(iosocket);
    
    // Add a new scene.
    iosocket.on('add_scene', function(scene) {
      scenes[scene.name] = scene;
      $('#messages').append($('<li></li>').text("added scene: " + scene.name ));
    });
    
    // Delete a scene.
    iosocket.on('delete_scene', function(scene_name) {
      delete scenes[scene_name];
      $('#messages').append($('<li></li>').text("deleted scene: " + scene_name));
    });
    
    // Play a scene.
    iosocket.on('play_scene', function(scene) {
      if(scenes[scene.name] != null) {
        currentScene = scenes[scene.name];
        currentScene.start_time = scene.start_time;
        current_frame = 0;
        $('#messages').append($('<li></li>').text("play scene: " + scene.name + " in " + (currentScene.start_time - kinda_ntp.time())));
        clearTimeout(last_timer);
        last_timer = setTimeout(function() {
          next_frame();
        }, currentScene.start_time - kinda_ntp.time());
      }
    });
    
    // Disconnected from socket.
    iosocket.on('disconnect', function() {
      $('#messages').append('<li>Disconnected</li>');
    });
  });
});