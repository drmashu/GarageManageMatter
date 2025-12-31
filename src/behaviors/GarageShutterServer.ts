import { StorageService, StorageContext } from "@matter/main";
import { WindowCoveringServer } from "@matter/node/behaviors/window-covering";
import { WindowCovering } from "@matter/main/clusters/window-covering";
import { MovementType, MovementDirection } from "@matter/node/behaviors/window-covering";
import { Gpio } from "../utils/GpioWrapper.js";
import { CONFIG } from "../config.js";

// 機能を有効化した基本クラスを定義
// パーセンテージ制御にはリフト(Lift)と位置認識リフト(PositionAwareLift)が不可欠です
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
    
    // デフォルトの制限値
    private openDistance: number = CONFIG.SHUTTER.FULL_OPEN_DISTANCE_CM;
    private closedDistance: number = CONFIG.SHUTTER.FULL_CLOSED_DISTANCE_CM;

    private storage: StorageContext | undefined;
    
    // GPIOを接続するためにinitialize()を実装します
    override async initialize() {
        await super.initialize();
        
        console.log("GarageShutterServer: GPIO を初期化中...");
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

        // ストレージの初期化
        const storageService = this.env.get(StorageService);
        this.storage = (storageService as any).createContext?.("GarageShutter") || (storageService as any).open?.("GarageShutter");

        if (this.storage) {
            const savedOpen = await this.storage.get<number>("openDistance");
            const savedClosed = await this.storage.get<number>("closedDistance");

            if (savedOpen !== undefined) this.openDistance = savedOpen;
            if (savedClosed !== undefined) this.closedDistance = savedClosed;
            
            console.log(`GarageShutterServer: ストレージから設定を読み込みました (Open: ${this.openDistance}, Closed: ${this.closedDistance})`);
        }

        // 計測ループをトリガーしますか？それともオンデマンドですか？
        // 理想的には、移動中に距離を監視します。
        
        // 設定の読み込み
        // 注意: 現時点では、オプション等で渡さない限り、index.tsで作成した正確なStorageContextに
        // 簡単にアクセスできない可能性があります。
        // このステップではカスタムストレージからの読み込みをスキップし、ロジックの正確さに集中します。
        // 永続化が必要な場合は、Endpointストレージへのアクセス方法を確認します。
    }

    /**
     * executeCalibrationをオーバーライドしてデフォルトのエラーを防ぎ、独自のシーケンスを実行します。
     */
    override async executeCalibration() {
        console.log("GarageShutterServer: キャリブレーションシーケンスを開始...");
        
        // 1. 停止するまで開く（UP）
        console.log("GarageShutterServer: フェーズ1 - 開いています...");
        await this.moveUntilStall(MovementDirection.Open);
        const measuredOpen = await this.getStableMeasurement();
        console.log(`GarageShutterServer: 測定された全開リミット: ${measuredOpen}cm`);
        this.openDistance = measuredOpen;

        // 2. 停止するまで閉じる（DOWN）
        console.log("GarageShutterServer: フェーズ2 - 閉じています...");
        await this.moveUntilStall(MovementDirection.Close);
        const measuredClosed = await this.getStableMeasurement();
        console.log(`GarageShutterServer: 測定された全閉リミット: ${measuredClosed}cm`);
        this.closedDistance = measuredClosed;

        // 保存
        console.log("GarageShutterServer: キャリブレーション完了。保存中...");
        if (this.storage) {
            await this.storage.set("openDistance", this.openDistance);
            await this.storage.set("closedDistance", this.closedDistance);
            console.log("GarageShutterServer: キャリブレーションデータを保存しました");
        }
    }

    /**
     * 実際の移動ロジックを処理します。
     */
    override async handleMovement(
        type: MovementType,
        reversed: boolean,
        direction: MovementDirection,
        targetPercent100ths?: number
    ) {
        // リフト(Lift)のみサポート
        if (type !== MovementType.Lift) return;

        const directionStr = direction === MovementDirection.Open ? '開' : '閉';
        console.log(`GarageShutterServer: ${directionStr}方向に移動中。ターゲット: ${targetPercent100ths}`);
        
        // 移動開始
        if (direction === MovementDirection.Open) {
            this.pinClose.digitalWrite(0);
            this.pinOpen.digitalWrite(1);
        } else {
            this.pinOpen.digitalWrite(0);
            this.pinClose.digitalWrite(1);
        }

        // 監視ループ
        return new Promise<void>((resolve) => {
            if (this.controlInterval) clearInterval(this.controlInterval);
            
            this.controlInterval = setInterval(() => {
                this.triggerMeasurement();
                const dist = this.currentDistance;
                
                // ターゲット到達確認
                // 現在の%を計算
                const range = this.closedDistance - this.openDistance;
                const currentP = ((dist - this.openDistance) / range) * 10000;
                
                // 状態更新
                this.state.currentPositionLiftPercent100ths = Math.max(0, Math.min(10000, Math.round(currentP)));
                
                // ターゲットチェックロジック
                if (targetPercent100ths !== undefined) {
                    const diff = targetPercent100ths - this.state.currentPositionLiftPercent100ths;
                    if (Math.abs(diff) < 500) { // 5% の許容誤差
                         console.log("GarageShutterServer: ターゲットに到達しました");
                         this.handleStopMovement();
                         resolve();
                    }
                }
                
                // 安全性: 制限チェック？
                
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
        this.pinOpen.trigger(CONFIG.SHUTTER.BUTTON_TRIGGER_MS, 1);
    }
    
    private triggerMeasurement() {
        this.pinTrig.trigger(CONFIG.SHUTTER.MEASUREMENT_TRIGGER_MS, 1);
    }

    private async moveUntilStall(direction: MovementDirection) {
        // 移動開始
        if (direction === MovementDirection.Open) {
            this.pinOpen.trigger(CONFIG.SHUTTER.BUTTON_TRIGGER_MS, 1);
        } else {
            this.pinClose.trigger(CONFIG.SHUTTER.BUTTON_TRIGGER_MS, 1);
        }
        
        // ストール（X秒間距離の変化なし）を監視
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
                 
                 // 2秒間安定している場合 (20 * 100ms)
                 if (sameCount > 20) {
                     console.log("GarageShutterServer: ストール検知 (移動終了)");
                     this.stopMotors();
                     clearInterval(interval);
                     resolve();
                 }
             }, 100);
        });
    }

    private async getStableMeasurement(): Promise<number> {
        // 5回の読み取り値の平均を取得
        let sum = 0;
        for(let i=0; i<5; i++) {
            this.triggerMeasurement();
            await new Promise(r => setTimeout(r, 100));
            sum += this.currentDistance;
        }
        return sum / 5;
    }
}
