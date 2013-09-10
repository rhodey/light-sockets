import org.json.JSONException;
import org.json.JSONObject;
import java.util.Date;

public class DmxFrameDevice {
  private static final int num_channels = 512;

  private static int id;
  private static short red_channel;
  private static short green_channel;
  private static short blue_channel;

  private static long last_time;
  private static boolean first_state = true;
  private static short[] last_dmx_state = new short[num_channels];

  public DmxFrameDevice(int id, short red_channel, short green_channel, short blue_channel) {
    this.id = id;
    this.red_channel = red_channel;
    this.green_channel = green_channel;
    this.blue_channel = blue_channel;
  }

  public int getId() {
    return id;
  }

  public short getRedChannel() {
    return red_channel;
  }

  public short getGreenChannel() {
    return green_channel;
  }

  public short getBlueChannel() {
    return blue_channel;
  }

  // Returns a new frame if DMX state changed on device channels.
  public static JSONObject nextFrame(short[] new_dmx_state) {
    JSONObject newFrame = null;

    // Handle first state state special case.
    if(first_state) {
      first_state = false;
      last_time = new Date().getTime();
      last_dmx_state = new_dmx_state;
      return null;
    }

    try {
      if(new_dmx_state[red_channel - 1] != last_dmx_state[red_channel - 1] ||
           new_dmx_state[green_channel - 1] != last_dmx_state[green_channel - 1] ||
           new_dmx_state[blue_channel - 1] != last_dmx_state[blue_channel - 1]) {

        newFrame = new JSONObject().put("id", id);
        newFrame.put("duration", (new Date().getTime()) - last_time);
        newFrame.put("color", String.format("#%02x%02x%02x",
                       new_dmx_state[red_channel - 1],
                       new_dmx_state[green_channel - 1],
                       new_dmx_state[blue_channel - 1]));

        last_time = new Date().getTime();
        last_dmx_state = new_dmx_state;
      }
    } catch (JSONException e) {
      e.printStackTrace();
      return null;
    }

    return newFrame;
  }
}
