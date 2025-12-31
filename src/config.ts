
export const CONFIG = {
    // GPIOピン割り当て (BCM番号)
    PINS: {
        // 照明
        LIGHTING: {
            BUTTON: 17,
            MAIN: 27,
            INDICATOR: 18,
        },
        // 換気扇
        VENTILATION: {
            BUTTON: 22,
            MAIN: 24,
            INDICATOR: 23,
        },
        // シャッター
        SHUTTER: {
            BUTTON_OPEN: 5,
            OPEN: 6,
            BUTTON_CLOSE: 20,
            CLOSE: 21,
            TRIG: 12,
            ECHO: 13,
        }
    },
    // シャッターキャリブレーション (距離 cm) 
    SHUTTER: {
        FULL_OPEN_DISTANCE_CM: 10,  // シャッターが全開の時のセンサー距離
        FULL_CLOSED_DISTANCE_CM: 200, // シャッターが全閉の時のセンサー距離
        BUTTON_TRIGGER_MS: 100, // オープン/クローズ時のボタントリガー時間
        MEASUREMENT_TRIGGER_MS: 10, // 距離計測時のトリガー時間 (マイクロ秒)
    },
    // ボタン押下判断の閾値(nano sec)
    GLITCH_FILTER_NS: 10000,
};
