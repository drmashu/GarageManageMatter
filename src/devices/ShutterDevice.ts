import { Endpoint } from "@matter/main";
import { WindowCoveringDevice } from "@matter/main/devices/window-covering";
import { GarageShutterServer } from "../behaviors/GarageShutterServer.js";
import { Gpio } from "../utils/GpioWrapper.js";
import { CONFIG } from "../config.js";

export class ShutterDevice {
    private device: any;
    private buttonPinOpen: any;
    private buttonPinClose: any;
    
    // ストレージコンテキストを引き続き受け取りますが、Behaviorが状態を管理するため、
    // 渡し方を変えるか、Behavior自身のコンテキストに頼る必要があるかもしれません。
    // 現時点では、コンストラクタのシグネチャの互換性を維持しています。
    constructor(storageContext: any, buttons?: { OPEN: number, CLOSE: number }) {
        // カスタムBehaviorを使用してEndpointを作成します
        // WindowCoveringDevice.with(GarageShutterServer) はデフォルトの WindowCoveringServer 実装を置き換えます。
        // ただし、WindowCoveringDevice は DeviceType 定義であり、このように簡単に 'with' できるクラスではない可能性があります。
        // Matter.js 0.15+ では、Endpoint コンストラクタで DeviceType が使用されます。
        // カスタムBehaviorを使用するには、特殊なデバイスタイプを定義するか、オプションを渡す必要があります。
        
        // 正しい方法は通常以下の通りです：
        const CustomShutterDevice = WindowCoveringDevice.with(GarageShutterServer);
        
        this.device = new Endpoint(CustomShutterDevice, { 
            id: "shutter",
            windowCovering: {
                // 初期状態をここで設定できます
                // mode: { calibrationMode: true } // 例
            }
        });
        
        // ストレージコンテキストをBehaviorに渡しますか？
        // Behaviorはフレームワークによってインスタンス化されます。
        // ストレージを別に処理するか、注入する必要があるかもしれません。
        // このステップでは、標準的なBehaviorのロードを想定しています。

        // 物理ボタンの設定
        if (buttons) {
            const setupShutterButton = (pin: number, target: number, label: string): any => {
                const button = new Gpio(pin, {
                    mode: Gpio.INPUT,
                    pullUpDown: Gpio.PUD_UP,
                    alert: true
                });

                button.glitchFilter(CONFIG.GLITCH_FILTER_NS);

                button.on('alert', (level: number) => {
                    if (level === 0) {
                        console.log(`ShutterDevice: 物理ボタン (${label}) により移動開始`);
                        this.device.set({ windowCovering: { targetPositionLiftPercent100ths: target } });
                    }
                });
                return button;
            };

            this.buttonPinOpen = setupShutterButton(buttons.OPEN, 0, "開");
            this.buttonPinClose = setupShutterButton(buttons.CLOSE, 10000, "閉");
        }
    }

    getMatterDevice() {
        return this.device;
    }
}
