package de.wellenvogel.avnav.worker;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.os.Build;

import com.felhr.usbserial.UsbSerialDevice;
import com.felhr.usbserial.UsbSerialInterface;

import org.json.JSONException;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import de.wellenvogel.avnav.main.R;
import de.wellenvogel.avnav.util.AvnLog;
import de.wellenvogel.avnav.util.NmeaQueue;

/**
 * Created by andreas on 25.12.14.
 */
public class UsbConnectionHandler extends SingleConnectionHandler {
    private Context ctx;
    private boolean permissionRequested=false;
    private static final String ACTION_USB_PERMISSION =
            "com.android.example.USB_PERMISSION";
    private static String CLAIM="usb";
    void deviceDetach(UsbDevice dev) {
        UsbSerialConnection usb=(UsbSerialConnection) connection;
        if (usb != null && usb.dev.equals(dev)){
            AvnLog.i(UsbSerialConnection.PREFIX,"device "+usb.getId()+" detached, closing");
            try {
                usb.close();
            } catch (IOException e) {
            }
            permissionRequested=false;
        }
    }

    static private class UsbSerialConnection extends AbstractConnection {
        UsbDevice dev;
        UsbDeviceConnection connection;
        String baud;
        UsbSerialDevice serialPort;
        ArrayList<Byte> buffer=new ArrayList<Byte>();
        final Object bufferLock=new Object();

        private void notifyWaiters(){
            synchronized (bufferLock){
                bufferLock.notifyAll();
            }
        }
        static String getProductName(UsbDevice device){
            if (device == null) return "";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                return device.getProductName();
            }
            return "";
        }
        final UsbSerialInterface.UsbReadCallback callback=new UsbSerialInterface.UsbReadCallback() {
            @Override
            public void onReceivedData(byte[] bytes) {
                synchronized (bufferLock) {
                    for (byte b : bytes) {
                        buffer.add(b);
                    }
                    bufferLock.notifyAll();
                }
            }
        };
        final static String PREFIX="AvnUsbSerial";
        UsbSerialConnection(Context ctx, UsbDevice dev, String baud) throws Exception {
            super();
            this.dev=dev;
            this.baud=baud;
            UsbManager manager=(UsbManager) ctx.getSystemService(Context.USB_SERVICE);
            connection=manager.openDevice(dev);
            if (connection == null) throw new Exception(dev.getDeviceName());
            //TODO: handle open connection error
        }
        @Override
        public void connect() throws IOException {
            buffer.clear();
            notifyWaiters();
            AvnLog.i(PREFIX,"connect to "+dev.getDeviceName());
            serialPort = UsbSerialDevice.createUsbSerialDevice(dev, connection);
            if (serialPort != null) {
                if (serialPort.open()) {
                    serialPort.setBaudRate(Integer.parseInt(baud));
                    serialPort.setDataBits(UsbSerialInterface.DATA_BITS_8);
                    serialPort.setStopBits(UsbSerialInterface.STOP_BITS_1);
                    serialPort.setParity(UsbSerialInterface.PARITY_NONE);
                    serialPort.setFlowControl(UsbSerialInterface.FLOW_CONTROL_OFF);
                    serialPort.read(callback);
                } else {
                    throw new IOException(PREFIX + ": unable to open serial device " + dev.getDeviceName());
                }
            }
            else{
                throw new IOException(PREFIX + ": unable to open serial device " + dev.getDeviceName());
            }
        }

        @Override
        public boolean shouldFail() {
            return true;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return new InputStream() {
                @Override
                public int read() throws IOException {
                    while (true) {
                        if (serialPort == null) return -1;
                        synchronized (bufferLock) {
                            if (buffer.size() > 0) return (int) buffer.remove(0);
                            if (serialPort == null) return -1;
                            try {
                                bufferLock.wait();
                            } catch (InterruptedException e) {
                            }
                        }
                    }
                }
                @Override
                public int read(byte[] obuffer, int byteOffset, int byteCount){
                    while (true) {
                        synchronized (bufferLock) {
                            if (buffer.size() > 0) {
                                int rt = 0;
                                while (rt < byteCount && buffer.size() > 0) {
                                    obuffer[byteOffset + rt] = buffer.remove(0);
                                    rt += 1;
                                }
                                return rt;
                            }
                            if (serialPort == null) return -1;
                            try {
                                bufferLock.wait();
                            } catch (InterruptedException e) {
                            }
                        }
                    }
                };
            };
        }

        @Override
        public OutputStream getOutputStream() throws IOException {
            return new OutputStream() {
                @Override
                public void write(int b) throws IOException {
                    byte [] buffer=new byte[1];
                    buffer[0]=(byte)b;
                    serialPort.write(buffer);
                }
            };
        }

        @Override
        public void close() throws IOException {
            AvnLog.i(PREFIX,"close connection to "+dev.getDeviceName());
            if (serialPort == null) return;
            try {
                serialPort.close();
            }catch (Throwable t){
                AvnLog.e("error closing usb connection",t);
            }
            serialPort=null;
            notifyWaiters();
        }

        @Override
        public String getId() {
            return dev.getDeviceName()+ " "+getProductName(dev);
        }


    }
    public static EditableParameter.StringListParameter DEVICE_SELECT=
            new EditableParameter.StringListParameter("device", R.string.labelSettingsUsbDevice);
    private EditableParameter.StringListParameter deviceSelect;
    private UsbConnectionHandler(String name, Context ctx, NmeaQueue queue) throws JSONException {
        super(name,ctx,queue);
        parameterDescriptions.add(BAUDRATE_PARAMETER);
        deviceSelect=new EditableParameter.StringListParameter(DEVICE_SELECT);
        deviceSelect.listBuilder=new EditableParameter.ListBuilder<String>() {
            @Override
            public List<String> buildList(EditableParameter.StringListParameter param) {
                UsbManager manager=(UsbManager) ctx.getSystemService(Context.USB_SERVICE);
                Map<String,UsbDevice> devices=manager.getDeviceList();
                ArrayList<String> rt = new ArrayList<String>(devices.keySet());
                return filterByClaims(CLAIM,rt,false);
            }
        };
        parameterDescriptions.add(deviceSelect);
        this.ctx=ctx;
    }

    @Override
    public void setDefaultDevice(String device) throws JSONException {
        DEVICE_SELECT.write(parameters,device);
        if (deviceSelect != null) {
            deviceSelect.defaultValue=device;
        }
    }

    @Override
    public void run(int startSequence) throws JSONException, IOException {
        String deviceName=deviceSelect.fromJson(parameters);
        addClaim(CLAIM,deviceName,true);
        UsbDevice device=null;
        while (device == null && ! shouldStop(startSequence)){
            UsbManager manager=(UsbManager) ctx.getSystemService(Context.USB_SERVICE);
            Map<String,UsbDevice> devices=manager.getDeviceList();
            device=devices.get(deviceName);
            String name=UsbSerialConnection.getProductName(device);
            if (device == null){
                setStatus(WorkerStatus.Status.ERROR,"device "+deviceName+" not available");
                sleep(2000);
            }
            else{
                if (! manager.hasPermission(device)){
                    if (! permissionRequested){
                        setStatus(WorkerStatus.Status.ERROR,"requested permissions for "+ device.getDeviceName());
                        PendingIntent permissionIntent = PendingIntent.getBroadcast(ctx, 0, new Intent(ACTION_USB_PERMISSION), 0);
                        manager.requestPermission(device,permissionIntent);
                        permissionRequested=true;

                    }
                    else {
                        setStatus(WorkerStatus.Status.ERROR, "no permission for device" + device.getDeviceName());
                    }
                    device=null;
                    sleep(5000);
                    continue;
                }
                setStatus(WorkerStatus.Status.STARTED,"connecting to "+deviceName+" "+name);
                try {
                    runInternal(new UsbSerialConnection(ctx, device, BAUDRATE_PARAMETER.fromJson(parameters)), startSequence);
                }catch(Throwable t){
                    setStatus(WorkerStatus.Status.ERROR,"unable to open device "+deviceName+" "+t.getMessage());
                    AvnLog.e("error opening usb device",t);
                    sleep(5000);
                }
                device=null;
            }
        }
    }


    static class Creator extends WorkerFactory.Creator{
        @Override
        ChannelWorker create(String name, Context ctx, NmeaQueue queue) throws JSONException {
            return new UsbConnectionHandler(name,ctx,queue);
        }
        @Override
        boolean canAdd(Context ctx) {
            return ctx.getPackageManager().hasSystemFeature(PackageManager.FEATURE_USB_HOST);
        }
    }

}
