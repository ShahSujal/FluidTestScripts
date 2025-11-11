import { FluidSDK } from "../dist/index.js";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
// Load environment variables
dotenv.config();
console.log("Starting test...");
try {
    const main = async () => {
        console.log("=== FluidSDK Test Suite ===\n");
        // Configuration
        const RPC_URL = process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
        const PRIVATE_KEY = process.env.PRIVATE_KEY;
        const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111");
        console.log("RPC URL:", RPC_URL);
        console.log("Chain ID:", CHAIN_ID);
        console.log("Has Private Key:", !!PRIVATE_KEY);
        // Create signer if private key is provided
        let signer;
        if (PRIVATE_KEY) {
            signer = new ethers.Wallet(PRIVATE_KEY);
            console.log("✅ Signer created:", signer.address);
        }
        else {
            console.log("⚠️  No PRIVATE_KEY provided - running in read-only mode");
        }
        // Initialize SDK
        console.log("\n--- Initializing SDK ---");
        const sdk = new FluidSDK({
            chainId: CHAIN_ID,
            rpcUrl: RPC_URL,
            signer: signer,
        });
        console.log("✅ SDK initialized");
        // Get chain ID
        const chainId = await sdk.chainId();
        console.log("Chain ID:", chainId);
        // Check if read-only mode
        console.log("Read-only mode:", sdk.isReadOnly);
        // Get registry addresses
        const registries = sdk.registries();
        console.log("Registry addresses:", JSON.stringify(registries, null, 2));
        console.log("\n=== Test Suite Completed ===");
    };
    main().catch((err) => {
        console.error("❌ Main error:", err);
        process.exit(1);
    });
}
catch (err) {
    console.error("❌ Top-level error:", err);
    process.exit(1);
}
