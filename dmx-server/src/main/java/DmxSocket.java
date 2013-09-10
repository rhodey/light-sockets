import io.socket.IOAcknowledge;
import io.socket.IOCallback;
import io.socket.SocketIO;
import io.socket.SocketIOException;
import ola.OlaNewDataReceivedCallback;

import org.json.JSONException;
import org.json.JSONObject;

import java.net.URL;
import java.util.LinkedList;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;

public class DmxSocket implements IOCallback, OlaNewDataReceivedCallback<short[]> {
  private static final int RECONNECT_DELAY = 1000;

  private URL host;
  private SocketIO socket;
  private List<DmxFrameDevice> DmxDevices;
  private int device_count = 0;

  public DmxSocket(URL socketHost) {
    host = socketHost;
    socket = new SocketIO();
    socket.connect(host, this);
    DmxDevices = new LinkedList<DmxFrameDevice>();
  }

  public DmxFrameDevice addFrameDevice(short red_channel, short green_channel, short blue_channel) {
    DmxFrameDevice newDevice = new DmxFrameDevice(device_count++, red_channel, green_channel, blue_channel);
    DmxDevices.add(newDevice);
    return newDevice;
  }

  @Override
  public void Run(short[] new_dmx_state) {
    for(DmxFrameDevice dmxDevice : DmxDevices) {
      JSONObject newFrame = dmxDevice.nextFrame(new_dmx_state);

      if(newFrame != null)
        socket.emit("add_frame", newFrame);
    }
  }

  @Override
  public void onConnect() {
    System.out.println("WebSocket connection established.");
  }

  @Override
  public void on(String event, IOAcknowledge ack, Object... args) {
    if(event.equals("add_device"))
      System.out.println("Add device.");

    else if(event.equals("remove_device"))
      System.out.println("Remove device");

    else
      System.out.println("Socket server triggered unknown event '" + event + "'");
  }

  @Override
  public void onMessage(JSONObject json, IOAcknowledge ack) {
    try {
      System.out.println("Socket server said:" + json.toString(2));
    } catch (JSONException e) {
      e.printStackTrace();
    }
  }

  @Override
  public void onMessage(String data, IOAcknowledge ack) {
    System.out.println("Socket server said: " + data);
  }

  @Override
  public void onError(SocketIOException socketIOException) {
    socket.disconnect();

    System.out.println("WebSocket error occurred, reconnecting in " + RECONNECT_DELAY + " seconds.");
    socketIOException.printStackTrace();

    Timer delayTimer = new Timer();
      delayTimer.schedule(new TimerTask() {
        @Override
        public void run() {
          socket = new SocketIO();
          socket.connect(host, DmxSocket.this);
        }
      }, RECONNECT_DELAY);
  }

  @Override
  public void onDisconnect() {
    System.out.println("WebSocket connection terminated.");
  }
}