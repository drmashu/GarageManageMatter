import { Endpoint } from "@matter/main";
import { OnOffLightDevice } from "@matter/main/devices/on-off-light";
import { OnOffCluster } from "@matter/main/clusters/on-off";
import { Gpio } from "../utils/GpioWrapper.js";

export class VentilationDevice {
    private pin: any;
    private indicatorPin: any;
    private device: any;

    constructor(pins: { MAIN: number, INDICATOR: number }) {
        this.pin = new Gpio(pins.MAIN, { mode: Gpio.OUTPUT });
        this.pin.digitalWrite(0);

        this.indicatorPin = new Gpio(pins.INDICATOR, { mode: Gpio.OUTPUT });
        this.indicatorPin.digitalWrite(0); // Initially OFF

        // Pass array of device definitions
        this.device = new Endpoint(OnOffLightDevice, { id: `vent-${pins.MAIN}` });

        const events = this.device.events;
        if (events.onOff && events.onOff.onOff$Changed) {
            events.onOff.onOff$Changed.on((on: boolean) => {
                console.log(`VentilationDevice: Turning ${on ? 'ON' : 'OFF'}`);
                this.pin.digitalWrite(on ? 1 : 0);
                
                // Indicator logic: ON when ventilation is ON
                this.indicatorPin.digitalWrite(on ? 1 : 0);
            });
        }
    }

    getMatterDevice() {
        return this.device;
    }
}
