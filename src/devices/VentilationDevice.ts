import { Endpoint } from "@matter/main";
import { OnOffLightDevice } from "@matter/main/devices/on-off-light";
import { OnOffCluster } from "@matter/main/clusters/on-off";
import { Gpio } from "../utils/GpioWrapper.js";
import { CONFIG } from "../config.js";

export class VentilationDevice {
    private pin: Gpio;
    private indicatorPin: Gpio;
    private device: any;

    constructor(pins: { MAIN: number, INDICATOR: number, BUTTON?: number }) {
        this.pin = new Gpio(pins.MAIN, { mode: Gpio.OUTPUT });
        this.pin.digitalWrite(0);

        this.indicatorPin = new Gpio(pins.INDICATOR, { mode: Gpio.OUTPUT });
        this.indicatorPin.digitalWrite(0); // 初期OFF

        // デバイス定義の配列を渡します
        this.device = new Endpoint(OnOffLightDevice, { id: `vent-${pins.MAIN}` });

        const events = this.device.events;
        if (events.onOff && events.onOff.onOff$Changed) {
            events.onOff.onOff$Changed.on((on: boolean) => {
                console.log(`VentilationDevice: ${on ? 'ON' : 'OFF'} に切替`);
                this.pin.digitalWrite(on ? 1 : 0);
                
                // インジケータロジック: 換気扇がONの時にON
                this.indicatorPin.digitalWrite(on ? 1 : 0);
            });
        }

        // 物理ボタンの設定
        if (pins.BUTTON !== undefined) {
            const button = new Gpio(pins.BUTTON, {
                mode: Gpio.INPUT,
                pullUpDown: Gpio.PUD_UP,
                alert: true
            });

            let lastPress = 0;
            const DEBOUNCE_MS = 300;

            button.glitchFilter(CONFIG.GLITCH_FILTER_NS);

            button.on('alert', (level: number) => {
                if (level === 0) {
                    const now = Date.now();
                    if (now - lastPress > DEBOUNCE_MS) {
                        lastPress = now;
                        const current = this.device.state.onOff.onOff;
                        console.log(`VentilationDevice: 物理ボタンにより ${!current ? 'ON' : 'OFF'} に切替`);
                        this.device.set({ onOff: { onOff: !current } });
                    }
                }
            });
        }
    }

    getMatterDevice() {
        return this.device;
    }
}
