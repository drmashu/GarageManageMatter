import { Endpoint } from "@matter/main";
import { OnOffLightDevice } from "@matter/main/devices/on-off-light";
import { OnOffCluster } from "@matter/main/clusters/on-off";
import { Gpio } from "../utils/GpioWrapper.js";
import { CONFIG } from "../config.js";

export class LightingDevice {
    private pin: any;
    private indicatorPin: any;
    private device: any; 
    private buttonPin: any;

    // コンストラクタはピン設定オブジェクトを受け取ります
    constructor(pins: { MAIN: number, INDICATOR: number, BUTTON?: number }) {
        this.pin = new Gpio(pins.MAIN, { mode: Gpio.OUTPUT });
        this.pin.digitalWrite(0);

        this.indicatorPin = new Gpio(pins.INDICATOR, { mode: Gpio.OUTPUT });
        // デフォルト状態は通常メインライトに基づきます。初期OFF -> インジケータON と仮定
        this.indicatorPin.digitalWrite(1);

        // デバイス定義の配列を渡します（※@matter/mainのAPI変更により現在は単一の定義を渡しています）
        this.device = new Endpoint(OnOffLightDevice, { id: `light-${pins.MAIN}` });

        // OnOff属性変更のリスナーを設定
        // 生成されたイベントにアクセスするためにデバイスに 'any' 型を使用
        const events = this.device.events;
        if (events.onOff && events.onOff.onOff$Changed) {
            events.onOff.onOff$Changed.on((on: boolean) => {
                console.log(`LightingDevice: ${on ? 'ON' : 'OFF'} に切替`);
                this.pin.digitalWrite(on ? 1 : 0);
                
                // インジケータロジック: ライト消灯時にON
                this.indicatorPin.digitalWrite(on ? 0 : 1);
            });
        }

        // 物理ボタンの設定
        if (pins.BUTTON !== undefined) {
            this.buttonPin = new Gpio(pins.BUTTON, {
                mode: Gpio.INPUT,
                pullUpDown: Gpio.PUD_UP,
                alert: true
            });

            let lastPress = 0;

            this.buttonPin.glitchFilter(CONFIG.GLITCH_FILTER_NS);

            this.buttonPin.on('alert', (level: number) => {
                if (level === 0) { // 押下時
                    const current = this.device.state.onOff.onOff;
                    console.log(`LightingDevice: 物理ボタンにより ${!current ? 'ON' : 'OFF'} に切替`);
                    this.device.set({ onOff: { onOff: !current } });
                }
            });
        }
    }

    getMatterDevice() {
        return this.device;
    }
}
