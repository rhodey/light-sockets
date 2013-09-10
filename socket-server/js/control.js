var iosocket = io.connect();
var scenes = new Array();
var state = null;
var uiState = {
  NAVIGATE :        10,
  WAIT_RECORDING :  11,
  RECORDING :       12,
  SELECTED :        13
}

var new_scene_name = null;
var selected_scene = null;
var recording = false;

var last_timer;
var first_frame = true;
var current_frame = 0;
var currentScene = {
  "name":"temp frame",
  "start_time":0,
  "frames":new Array()
};

// Converts a hex string to RGB color coordinates.
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    red:   parseInt(result[1], 16),
    green: parseInt(result[2], 16),
    blue:  parseInt(result[3], 16)
  } : null;
}

function set_state(new_state) {
  switch(new_state) {
    case uiState.NAVIGATE:
      state = uiState.NAVIGATE;
      if(selected_scene != null)
        $("#scene_" + selected_scene).removeClass("selected");
      $("#scene_name_div").hide();
      $("#play_scene_button").unbind().hide();
      $("#delete_scene_button").unbind().hide();
      $("#add_scene_button").removeClass("disabled").show().unbind().click(new_scene);
      $("#start_recording_button").addClass("disabled").unbind().show();
      $("#stop_recording_button").addClass("disabled").unbind().show();
      break;
    
    case uiState.WAIT_RECORDING:
      state = uiState.WAIT_RECORDING;
      if(selected_scene != null)
        $("#scene_" + selected_scene).removeClass("selected");
      $("#scene_name_div").addClass("success");
      $("#scene_name_input").removeAttr("disabled");
      $("#play_scene_button").unbind().hide();
      $("#delete_scene_button").unbind().hide();
      $("#add_scene_button").addClass("disabled").unbind();
      $("#start_recording_button").removeClass("disabled").unbind().click(start_recording).show();
      $("#stop_recording_button").addClass("disabled").unbind().show();
      break;
    
    case uiState.RECORDING:
      state = uiState.RECORDING;
      $("#scene_name_div").removeClass("success");
      $("#scene_name_input").attr("disabled", "disabled");
      $("#play_scene_button").unbind().hide();
      $("#delete_scene_button").unbind().hide();
      $("#add_scene_button").addClass("disabled").unbind();
      $("#start_recording_button").addClass("disabled").unbind().show();
      $("#stop_recording_button").removeClass("disabled").unbind().click(stop_recording).show();
      break;
    
    case uiState.SELECTED:
      state = uiState.SELECTED;
      $("#scene_name_div").hide();
      $("#play_scene_button").show().unbind().click(function(event) {
        play_scene(selected_scene);
      });
      $("#delete_scene_button").show().unbind().click(function(event) {
        delete_scene(selected_scene);
        iosocket.emit("delete_scene", selected_scene);
      });
      $("#add_scene_button").removeClass("disabled").unbind().click(new_scene);
      $("#start_recording_button").unbind().hide();
      $("#stop_recording_button").unbind().hide();
      break;
    
    default:
      break;
  }
}

// Recursively iterate through scenes.
function next_frame() {
  if(current_frame < currentScene.frames.length) {
    $("#screen").css("background-color", currentScene.frames[current_frame].color);
    $("#slider_red").css("height", 100 - (hexToRgb(currentScene.frames[current_frame].color).red / 255) * 100 + '%');
    $("#slider_green").css("height", 100 - (hexToRgb(currentScene.frames[current_frame].color).green / 255) * 100 + '%');
    $("#slider_blue").css("height", 100 - (hexToRgb(currentScene.frames[current_frame].color).blue / 255) * 100 + '%');
    currentScene.start_time += currentScene.frames[current_frame].duration;
    last_timer = setTimeout(function() {
      next_frame();
    }, currentScene.start_time - kinda_ntp.time());
    current_frame++;
  }
}

function check_scene_name() {
  console.log("input: " + $("#scene_name_input").val());
  if(state != uiState.WAIT_RECORDING)
    return;
  
  if($("#scene_name_input").val() == "" || scenes[$("#scene_name_input").val()] != null) {
    $("#scene_name_div").removeClass("success").addClass("error");
    $("#scene_name_check").hide();
  }
  else {
    $("#scene_name_div").removeClass("error").addClass("success");
    $("#scene_name_check").show();
  }
}
  
// Prepare to record a new scene.
function new_scene() {
  console.log("new_scene()");
  
  set_state(uiState.WAIT_RECORDING);
  $("#scene_name_div").show();
  $("#scene_name_input").val("");
  $("#scene_name_input").focus();
  check_scene_name();
}

// Start recording a new scene.
function start_recording() {
  console.log("start_recording()");
  
  if($("#scene_name_div").hasClass("error"))
    return;
  
  set_state(uiState.RECORDING);
  clearTimeout(last_timer);
  new_scene_name = $("#scene_name_input").val();
  scenes[new_scene_name] = {
    "name" : new_scene_name,
    "frames" : new Array()
  };
  recording = true;
  first_frame = true;
  current_frame = 0;
}

// Stop the recording of a new scene.
function stop_recording() {
  console.log("stop_recording()");
  
  set_state(uiState.NAVIGATE);
  recording = false;
  first_frame = true;
  add_scene(scenes[new_scene_name], true);
  iosocket.emit("add_scene", scenes[new_scene_name]);
}

// Add a scene to the list of available scenes.
function add_scene(scene, override) {
  console.log("add_scene(" + scene.name + ")");
  
  if(scenes[scene.name] == null || override) {
    $("#scenes").append($('<div class="scene_display" id="scene_' +  scene.name + '"></div>').html(scene.name));
    $("#scene_" + scene.name).click(function() {
      $(this).addClass("selected").siblings().removeClass("selected");
      selected_scene = $(this).attr("id").substr(6, $(this).attr("id").length);
      console.log("selected scene: " + selected_scene);
      set_state(uiState.SELECTED);
    });
  }
  scenes[scene.name] = scene;
}

// Play a scene on connected devices.
function play_scene(scene_name) {
  console.log("play_scene(" + scene_name + ")");
  
  scene = {
    "name" : scene_name,
    "start_time" : kinda_ntp.time()
  };
  iosocket.emit("play_scene", scene);
  
  currentScene = scenes[scene.name];
  currentScene.start_time = scene.start_time;
  current_frame = 0;
  console.log("wait till play: " + (currentScene.start_time - kinda_ntp.time()));
  clearTimeout(last_timer);
  last_timer = setTimeout(function() {
    next_frame();
  }, currentScene.start_time - kinda_ntp.time());
}

function delete_scene(scene_name) {
  console.log("delete_scene(" + scene_name + ")");
  
  set_state(uiState.NAVIGATE);
  delete scenes[scene_name];
  $("#scene_" + scene_name).remove();
}

iosocket.on("connect", function () {
  console.log("iosocket:connect()");
  kinda_ntp.init(iosocket);
  
  // Authenticate and grab scenes from server.
  iosocket.emit("authenticate", "crowd-control");
  iosocket.emit("get_scenes");
});

iosocket.on("add_frame", function(frame) {
  if(recording) {
    if(first_frame)
      first_frame = false;
    else {
      scenes[new_scene_name].frames[current_frame] = frame;
      current_frame++;
    }
  }
  $("#screen").css("background-color", frame.color);
  $("#slider_red").css("height", 100 - (hexToRgb(frame.color).red / 255) * 100 + '%');
  $("#slider_green").css("height", 100 - (hexToRgb(frame.color).green / 255) * 100 + '%');
  $("#slider_blue").css("height", 100 - (hexToRgb(frame.color).blue / 255) * 100 + '%');
});

iosocket.on("add_scene", function(scene) {
  console.log("iosocket:add_scene(" + scene.name + ")");
  add_scene(scene, false);
});

iosocket.on("delete_scene", function(scene_name) {
  console.log("iosocket:delete_scene(" + scene_name + ")");
  delete_scene(scene_name);
});

iosocket.on("disconnect", function() {
  console.log("iosocket:disconnect()");
});

$(document).ready(function() {
  set_state(uiState.NAVIGATE);
  $("#scene_name_input").keyup(check_scene_name);
});