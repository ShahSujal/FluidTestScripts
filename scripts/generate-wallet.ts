import { ethers } from "ethers";

/**
 * Generate a new random wallet for testing
 * 
 * This script creates a new Ethereum wallet and displays its private key and address.
 * Use this to generate a FEEDBACK_PRIVATE_KEY for testing feedback operations.
 */

console.log("=".repeat(70));
console.log("🔑 Generating New Ethereum Wallet");
console.log("=".repeat(70));

const wallet = ethers.Wallet.createRandom();

console.log("\n✅ New wallet generated!");
console.log("\n📋 Wallet Details:");
console.log("   Address:", wallet.address);
console.log("   Private Key:", wallet.privateKey);

console.log("\n💡 To use this wallet for feedback:");
console.log("   1. Copy the private key above");
console.log("   2. Add to your .env file:");
console.log(`      FEEDBACK_PRIVATE_KEY="${wallet.privateKey}"`);
console.log("\n   3. Get testnet ETH for this address:");
console.log("      Visit: https://sepoliafaucet.com/");
console.log(`      Send ETH to: ${wallet.address}`);
console.log("\n   4. Run your test:");
console.log("      npm run test:fullflow-mcp");

console.log("\n⚠️  WARNING:");
console.log("   - Never share your private key with anyone");
console.log("   - Never commit private keys to git");
console.log("   - This is for TESTNET only, never use for mainnet");
console.log("=".repeat(70));
