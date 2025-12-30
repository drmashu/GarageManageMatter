import { Endpoint } from "@matter/main";
import { OnOffLightDevice } from "@matter/main/devices/on-off-light";
import { OnOffCluster } from "@matter/main/clusters/on-off";
import { Gpio } from "../utils/GpioWrapper.js";

export class LightingDevice {
    private pin: any;
    private indicatorPin: any;
    private device: any; 

    // Constructor accepts pin configuration object
    constructor(pins: { MAIN: number, INDICATOR: number }) {
        this.pin = new Gpio(pins.MAIN, { mode: Gpio.OUTPUT });
        this.pin.digitalWrite(0);

        this.indicatorPin = new Gpio(pins.INDICATOR, { mode: Gpio.OUTPUT });
        // Default state usually based on main light. Assuming initial OFF -> Indicator ON
        this.indicatorPin.digitalWrite(1);

        // Pass array of device definitions
        this.device = new Endpoint(OnOffLightDevice, { id: `light-${pins.MAIN}` });

        // Setup listener for OnOff attribute changes
        // Using 'any' type for device to access generated events
        const events = this.device.events;
        if (events.onOff && events.onOff.onOff$Changed) {
            events.onOff.onOff$Changed.on((on: boolean) => {
                console.log(`LightingDevice: Turning ${on ? 'ON' : 'OFF'}`);
                this.pin.digitalWrite(on ? 1 : 0);
                
                // Indicator logic: ON when light is OFF
                this.indicatorPin.digitalWrite(on ? 0 : 1);
            });
        }
    }

    getMatterDevice() {
        return this.device;
    }
}
