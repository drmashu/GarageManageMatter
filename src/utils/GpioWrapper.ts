import type { Gpio as GpioType } from 'pigpio';

let GpioClass: any;

// 通常 Gpio クラスで使用可能な定数
const CONSTANTS = {
    INPUT: 0,
    OUTPUT: 1,
    ALT0: 4,
    ALT1: 5,
    ALT2: 6,
    ALT3: 7,
    ALT4: 3,
    ALT5: 2,
    PUD_OFF: 0,
    PUD_DOWN: 1,
    PUD_UP: 2,
    RISING_EDGE: 0,
    FALLING_EDGE: 1,
    EITHER_EDGE: 2,
};

try {
    // Linux上でのみ pigpio を要求するよう試行
    if (process.platform !== 'linux') {
        throw new Error("Not on Linux, forcing mock.");
    }
    const pigpio = require('pigpio');
    GpioClass = pigpio.Gpio;
} catch (e) {
    console.warn("pigpio を読み込めませんでした。モック実装を使用します。(Raspberry Pi 以外では正常な動作です)");
    
    // 静的な定数を持つモック Gpio クラス
    GpioClass = class MockGpio {
        static INPUT = CONSTANTS.INPUT;
        static OUTPUT = CONSTANTS.OUTPUT;
        static ALT0 = CONSTANTS.ALT0;
        static ALT1 = CONSTANTS.ALT1;
        static ALT2 = CONSTANTS.ALT2;
        static ALT3 = CONSTANTS.ALT3;
        static ALT4 = CONSTANTS.ALT4;
        static ALT5 = CONSTANTS.ALT5;
        static PUD_OFF = CONSTANTS.PUD_OFF;
        static PUD_DOWN = CONSTANTS.PUD_DOWN;
        static PUD_UP = CONSTANTS.PUD_UP;
        static RISING_EDGE = CONSTANTS.RISING_EDGE;
        static FALLING_EDGE = CONSTANTS.FALLING_EDGE;
        static EITHER_EDGE = CONSTANTS.EITHER_EDGE;

        constructor(gpio: number, options: any) {
            console.log(`[MockGpio] ピン ${gpio} を以下のオプションで初期化しました:`, JSON.stringify(options));
        }
        digitalWrite(level: number) {
            console.log(`[MockGpio] digitalWrite: ${level}`);
        }
        pwmWrite(dutyCycle: number) { 
            console.log(`[MockGpio] pwmWrite: ${dutyCycle}`);
        }
        trigger(pulseLen: number, level: number) {
            console.log(`[MockGpio] trigger: ${pulseLen}us level:${level}`);
        }
        on(event: string, callback: (...args: any[]) => void) {
            console.log(`[MockGpio] ${event} のイベントリスナーが追加されました`);
        }
        off(event: string, callback: (...args: any[]) => void) {}
        getMode() { return 0; }
        mode(mode: number) {} 
    }
}

export { GpioClass as Gpio };
