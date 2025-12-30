
export const CONFIG = {
    // GPIOピン割り当て (BCM番号)
    PINS: {
        LIGHTING: {
            MAIN: 17,
            INDICATOR: 5,
            BUTTON: 4
        },
        VENTILATION: {
            MAIN: 27,
            INDICATOR: 6,
            BUTTON: 18
        },
        SHUTTER: {
            OPEN: 22,
            CLOSE: 23,
            TRIG: 24,
            ECHO: 25,
            BUTTON_OPEN: 12,
            BUTTON_CLOSE: 13
        }
    },
    // シャッターキャリブレーション (距離 cm)
    SHUTTER: {
        FULL_OPEN_DISTANCE_CM: 10,  // シャッターが全開の時のセンサー距離
        FULL_CLOSED_DISTANCE_CM: 100 // シャッターが全閉の時のセンサー距離
    }
};
