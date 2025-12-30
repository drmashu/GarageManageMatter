import { ServerNode } from "@matter/node";
import { StorageService } from "@matter/main";
import { LightingDevice } from "./devices/LightingDevice.js";
import { VentilationDevice } from "./devices/VentilationDevice.js";
import { ShutterDevice } from "./devices/ShutterDevice.js";
import { CONFIG } from "./config.js";

async function main() {
    console.log("Starting GarageManage Matter Server...");

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

    // Environment context for storage
    const environment = node.env;
    const storageService = environment.get(StorageService);
    
    // Create or retrieve storage context
    // Using simple approach compatible with mocks/impl
    const storageContext = (storageService as any).createContext?.("GarageManage") || (storageService as any).open?.("GarageManage");

    // Instantiate Devices
    // Device constructors will be updated to accept objects
    const lighting = new LightingDevice(CONFIG.PINS.LIGHTING);
    const ventilation = new VentilationDevice(CONFIG.PINS.VENTILATION);
    const shutter = new ShutterDevice(storageContext);

    // Add Devices to Server
    // Devices created via Endpoint([]) should be compatible with node.add()
    await node.add(lighting.getMatterDevice());
    await node.add(ventilation.getMatterDevice());
    await node.add(shutter.getMatterDevice());

    console.log("Devices added. Starting server...");

    await node.start();

    console.log("GarageManage Server is running!");
    console.log("Pairing Code: 20202021");
    // console.log("Make sure to run this with 'sudo' for GPIO access on Raspberry Pi.");
}

main().catch(console.error);
