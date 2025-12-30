import { Endpoint } from "@matter/main";
import { WindowCoveringDevice } from "@matter/main/devices/window-covering";
import { GarageShutterServer } from "../behaviors/GarageShutterServer.js";

export class ShutterDevice {
    private device: any;
    
    // We still accept storage context but since behavior manages state, 
    // we might need to pass it differently or rely on behavior's own context.
    // For now, keeping constructor signature compatible.
    constructor(storageContext: any) {
        // Create Endpoint using the custom Behavior
        // WindowCoveringDevice.with(GarageShutterServer) replaces the default WindowCoveringServer implementation.
        // BUT WindowCoveringDevice is likely a DeviceType definition, not a class we can easily 'with' like that?
        // In Matter.js 0.15+, DeviceTypes are used with Endpoint constructor.
        // To use custom behavior, we likely need to define a specialized device type or pass options.
        
        // Correct way often is:
        const CustomShutterDevice = WindowCoveringDevice.with(GarageShutterServer);
        
        this.device = new Endpoint(CustomShutterDevice, { 
            id: "shutter",
            windowCovering: {
                // Initial state can be set here
                // mode: { calibrationMode: true } // Example
            }
        });
        
        // Pass storage context to the behavior?
        // Behaviors are instantiated by the framework. 
        // We might need to handle storage differently or inject it.
        // For this step, we assume standard behavior loading.
    }

    getMatterDevice() {
        return this.device;
    }
}
