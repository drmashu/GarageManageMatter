import { ServerNode } from "@matter/node";
import { StorageService } from "@matter/main";
import { LightingDevice } from "./devices/LightingDevice.js";
import { VentilationDevice } from "./devices/VentilationDevice.js";
import { ShutterDevice } from "./devices/ShutterDevice.js";
import { Gpio } from "./utils/GpioWrapper.js";
import { CONFIG } from "./config.js";

async function main() {
    console.log("GarageManage Matter サーバーを起動しています...");

    const node = await ServerNode.create({
        id: "GarageManage",
        network: {
            port: 5540,
        },
        commissioning: {
            passcode: 20202021,
            discriminator: 3840,
        },
        productDescription: {
            name: "GarageManage Device",
            deviceType: 22, // Root Node
            vendorId: 0xFFF1,
            productId: 0x8001,
        },
        basicInformation: {
            vendorName: "GarageManage",
            serialNumber: "12345678",
            softwareVersion: 1,
            softwareVersionString: "v1.0.0",
            nodeLabel: "GarageManage",
            productName: "GarageManage Device",
        },
    });

    // ストレージ用の環境コンテキスト
    const environment = node.env;
    const storageService = environment.get(StorageService);
    
    // ストレージコンテキストの作成または取得
    // モック/実装と互換性のあるシンプルなアプローチを使用
    const storageContext = await ((storageService as any).createContext?.("GarageManage") || (storageService as any).open?.("GarageManage"));

    // デバイスのインスタンス化
    const lighting = new LightingDevice(CONFIG.PINS.LIGHTING);
    const ventilation = new VentilationDevice(CONFIG.PINS.VENTILATION);
    const shutter = new ShutterDevice(storageContext, {
        OPEN: CONFIG.PINS.SHUTTER.BUTTON_OPEN,
        CLOSE: CONFIG.PINS.SHUTTER.BUTTON_CLOSE
    });

    // サーバーにデバイスを追加
    // Endpoint([])経由で作成されたデバイスは node.add() と互換性があるはずです
    await node.add(lighting.getMatterDevice());
    await node.add(ventilation.getMatterDevice());
    await node.add(shutter.getMatterDevice());

    console.log("デバイスと物理ボタンの設定が完了しました。サーバーを開始します...");

    await node.start();

    console.log("GarageManage サーバーが実行中です！");
    console.log("ペアリングコード: 20202021");
    // console.log("Raspberry PiでGPIOにアクセスするには 'sudo' で実行してください。");
}

main().catch(console.error);
