
export const CONFIG = {
    // GPIO Pin Assignments (BCM numbering)
    PINS: {
        LIGHTING: {
            MAIN: 17,
            INDICATOR: 5
        },
        VENTILATION: {
            MAIN: 27,
            INDICATOR: 6
        },
        SHUTTER: {
            OPEN: 22,
            CLOSE: 23,
            TRIG: 24,
            ECHO: 25
        }
    },
    // Shutter Calibration (Distance in cm)
    SHUTTER: {
        FULL_OPEN_DISTANCE_CM: 10,  // Sensor distance when shutter is fully open
        FULL_CLOSED_DISTANCE_CM: 100 // Sensor distance when shutter is fully closed
    }
};
