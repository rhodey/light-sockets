import ola.OlaCallback;
import ola.OlaClientNIO;
import ola.RequestStatus;
import ola.proto.Ola.RegisterAction;

import java.net.MalformedURLException;
import java.net.URL;

public class DmxServer {
  private static final int universe = 0;
  private static final String URI   = "http://127.0.0.1";
  private static final int port     = 8080;

  private static OlaClientNIO olaClient;
  private static DmxSocket    dmxSocket;

  private static class RegisterCallback<T> implements OlaCallback<T> {
    public void Run(RequestStatus status, T t) {
      System.out.println("Register status: " + status.getState() + ", register data: " + t);
    }
  }

  public static void main(String[] args) {
    try {
      // Client to Open Lighting Architecture daemon.
      olaClient = new OlaClientNIO();

      // Socket.io client and OLA data (dmx) listener.
      URL socketIoHost = new URL(URI + ":" + port);
      dmxSocket = new DmxSocket(socketIoHost);

      // Register our DmxSocket to DMX universe 0.
      if(!olaClient.registerUniverse(universe, RegisterAction.REGISTER, dmxSocket, new RegisterCallback())) {
        System.out.println("Failed to register with universe " + universe + ", bummer.");
        return;
      }

      // Model of a simple RGB light using dmx channels 1(red), 2(green), 3(blue).
      DmxFrameDevice rgbLightOne = dmxSocket.addFrameDevice((short)1, (short)2, (short)3);
      System.out.println("Check it out, DmxFrameDevices have an id... cool? " + rgbLightOne.getId());

    } catch (MalformedURLException e) {
      System.out.println("Malformed URL?");
      e.printStackTrace();
    } catch (Exception e) {
      System.out.println("OLAClient failed hard.");
      e.printStackTrace();
    }
  }
}