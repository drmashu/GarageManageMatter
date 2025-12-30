import { WindowCoveringServer } from "@matter/node/behaviors/window-covering";
import { WindowCovering } from "@matter/main/clusters/window-covering";
import { MovementType, MovementDirection } from "@matter/node/behaviors/window-covering";
import { Gpio } from "../utils/GpioWrapper.js";
import { CONFIG } from "../config.js";
import { StorageContext } from "@matter/main";

// Define the base class with features enabled
// Lift + PositionAwareLift are essential for percentage control
const GarageShutterBase = WindowCoveringServer.with(
    WindowCovering.Feature.Lift,
    WindowCovering.Feature.PositionAwareLift
);

export class GarageShutterServer extends GarageShutterBase {
    private pinOpen: any;
    private pinClose: any;
    private pinTrig: any;
    private pinEcho: any;
    
    private lastTick: number = 0;
    private currentDistance: number = 0;
    private controlInterval: NodeJS.Timeout | null = null;
    
    // Default Limits
    private openDistance: number = CONFIG.SHUTTER.FULL_OPEN_DISTANCE_CM;
    private closedDistance: number = CONFIG.SHUTTER.FULL_CLOSED_DISTANCE_CM;
    
    // We need a way to initialize or access storage. 
    // Behaviors have access to this.context or similar, but storage persistence for custom fields
    // usually requires using Managed State or manual storage access.
    // For simplicity, we'll try to use the environment's storage if accessible, 
    // or just rely on manual load if we can inject storage context.
    // BUT Behaviors are instantiated by the framework.
    // We can use `this.agent.context` or similar? 
    // Let's stick to simple file-scope storage or static if needed, 
    // but better: Use `this.context.storage` (if available in 0.15 API).
    // Actually, `this.context` in a Behavior refers to the Endpoint's context?
    
    // Let's implement initialize() to hook up GPIOs
    override async initialize() {
        await super.initialize();
        
        console.log("GarageShutterServer: Initializing GPIOs...");
        this.pinOpen = new Gpio(CONFIG.PINS.SHUTTER.OPEN, { mode: Gpio.OUTPUT });
        this.pinClose = new Gpio(CONFIG.PINS.SHUTTER.CLOSE, { mode: Gpio.OUTPUT });
        this.pinTrig = new Gpio(CONFIG.PINS.SHUTTER.TRIG, { mode: Gpio.OUTPUT });
        this.pinEcho = new Gpio(CONFIG.PINS.SHUTTER.ECHO, { mode: Gpio.INPUT, alert: true });

        this.stopMotors();

        this.pinEcho.on('alert', (level: number, tick: number) => {
            if (level === 1) {
                this.lastTick = tick;
            } else {
                const diff = (tick >> 0) - (this.lastTick >> 0);
                const dist = diff * 0.017;
                if (dist > 0 && dist < 400) {
                    this.currentDistance = dist;
                }
            }
        });

        // Trigger measurement loop? Or just on demand?
        // Ideally we monitor distance while moving.
        
        // Load Settings
        // Note: For now we might not have easy access to the exact StorageContext we created in index.ts
        // unless we pass it via options or similar. 
        // We will skip loading from customized storage for this step and focus on logic correctness.
        // If we need persistence, we can check how to access Endpoint storage.
    }

    /**
     * Override executeCalibration to prevent default error and run our sequence.
     */
    override async executeCalibration() {
        console.log("GarageShutterServer: Starting Calibration Sequence...");
        
        // 1. Move to Open (UP) until stall
        console.log("GarageShutterServer: Phase 1 - Opening...");
        await this.moveUntilStall(MovementDirection.Open);
        const measuredOpen = await this.getStableMeasurement();
        console.log(`GarageShutterServer: Measured Open Limit: ${measuredOpen}cm`);
        this.openDistance = measuredOpen;

        // 2. Move to Close (DOWN) until stall
        console.log("GarageShutterServer: Phase 2 - Closing...");
        await this.moveUntilStall(MovementDirection.Close);
        const measuredClosed = await this.getStableMeasurement();
        console.log(`GarageShutterServer: Measured Closed Limit: ${measuredClosed}cm`);
        this.closedDistance = measuredClosed;

        // Save
        console.log("GarageShutterServer: Calibration Complete. Saving...");
        // TODO: Save to storage
    }

    /**
     * Handle actual movement logic.
     */
    override async handleMovement(
        type: MovementType,
        reversed: boolean,
        direction: MovementDirection,
        targetPercent100ths?: number
    ) {
        // We only support Lift
        if (type !== MovementType.Lift) return;

        console.log(`GarageShutterServer: Moving ${direction === MovementDirection.Open ? 'OPEN' : 'CLOSE'} target=${targetPercent100ths}`);
        
        // Start moving
        if (direction === MovementDirection.Open) {
            this.pinClose.digitalWrite(0);
            this.pinOpen.digitalWrite(1);
        } else {
            this.pinOpen.digitalWrite(0);
            this.pinClose.digitalWrite(1);
        }

        // Monitoring Loop
        return new Promise<void>((resolve) => {
            if (this.controlInterval) clearInterval(this.controlInterval);
            
            this.controlInterval = setInterval(() => {
                this.triggerMeasurement();
                const dist = this.currentDistance;
                
                // Check if target reached
                // Calculate current %
                const range = this.closedDistance - this.openDistance;
                const currentP = ((dist - this.openDistance) / range) * 10000;
                
                // Update state
                this.state.currentPositionLiftPercent100ths = Math.max(0, Math.min(10000, Math.round(currentP)));
                
                // Target check logic
                if (targetPercent100ths !== undefined) {
                    const diff = targetPercent100ths - this.state.currentPositionLiftPercent100ths;
                    if (Math.abs(diff) < 500) { // 5% tolerance
                         console.log("GarageShutterServer: Target Reached");
                         this.handleStopMovement();
                         resolve();
                    }
                }
                
                // Safety: Limit check?
                
            }, 100);
        });
    }

    override async handleStopMovement() {
        this.stopMotors();
        if (this.controlInterval) {
            clearInterval(this.controlInterval);
            this.controlInterval = null;
        }
    }

    private stopMotors() {
        this.pinOpen.digitalWrite(0);
        this.pinClose.digitalWrite(0);
    }
    
    private triggerMeasurement() {
        this.pinTrig.trigger(10, 1);
    }

    private async moveUntilStall(direction: MovementDirection) {
        // Start moving
        if (direction === MovementDirection.Open) {
            this.pinClose.digitalWrite(0);
            this.pinOpen.digitalWrite(1);
        } else {
            this.pinOpen.digitalWrite(0);
            this.pinClose.digitalWrite(1);
        }
        
        // Monitor for stall (no change in distance for X seconds)
        return new Promise<void>((resolve) => {
             let lastDist = this.currentDistance;
             let sameCount = 0;
             
             const interval = setInterval(() => {
                 this.triggerMeasurement();
                 const current = this.currentDistance;
                 
                 if (Math.abs(current - lastDist) < 2) {
                     sameCount++;
                 } else {
                     sameCount = 0;
                     lastDist = current;
                 }
                 
                 // If stable for 2 seconds (20 * 100ms)
                 if (sameCount > 20) {
                     console.log("GarageShutterServer: Stall detected (End of travel)");
                     this.stopMotors();
                     clearInterval(interval);
                     resolve();
                 }
             }, 100);
        });
    }

    private async getStableMeasurement(): Promise<number> {
        // Take average of 5 readings
        let sum = 0;
        for(let i=0; i<5; i++) {
            this.triggerMeasurement();
            await new Promise(r => setTimeout(r, 100));
            sum += this.currentDistance;
        }
        return sum / 5;
    }
}
