import { FluidSDK } from "../dist/index.js";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const main = async () => {
  try {
    console.log("=== FluidSDK Test Suite ===\n");

    // Configuration
    const RPC_URL = process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"; // Default to free public RPC
    const PRIVATE_KEY = process.env.PRIVATE_KEY; // Optional: for write operations
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111"); // Sepolia chain ID

    // Create signer if private key is provided
    let signer: ethers.Wallet | undefined;
    if (PRIVATE_KEY) {
      signer = new ethers.Wallet(PRIVATE_KEY);
      console.log("✅ Signer created:", signer.address);
    } else {
      console.log("⚠️  No PRIVATE_KEY provided - running in read-only mode");
    }

    // Initialize SDK
    console.log("\n--- Initializing SDK ---");
    const sdk = new FluidSDK({
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
      signer: signer,
      // Optional: IPFS configuration
      // ipfs: 'pinata',
      // pinataJwt: process.env.PINATA_JWT,
    });

    console.log("✅ SDK initialized");
    
    // Get chain ID
    const chainId = await sdk.chainId();
    console.log("Chain ID:", chainId);
    
    // Check if read-only mode
    console.log("Read-only mode:", sdk.isReadOnly);
    
    // Get registry addresses
    const registries = sdk.registries();
    console.log("Registry addresses:", registries);

    // Test 1: Create Agent (off-chain)
    console.log("\n--- Test 1: Create Agent (off-chain) ---");
    const agent = sdk.createAgent(
      "Test Agent",
      "A test agent for FluidSDK",
      "ipfs://QmTestImageHash"
    );
    console.log("✅ Agent created:", agent);

    // Test 2: Search Agents (read-only)
    console.log("\n--- Test 2: Search Agents ---");
    try {
      const searchResult = await sdk.searchAgents(
        {
          // Add search filters as needed
          // tags: ["ai", "assistant"],
          // capabilities: ["chat"],
        },
        undefined, // sort
        10 // pageSize
      );
      console.log(`✅ Found ${searchResult.items.length} agents`);
      if (searchResult.items.length > 0) {
        console.log("First agent:", searchResult.items[0]);
      }
      if (searchResult.meta) {
        console.log("Search metadata:", searchResult.meta);
      }
    } catch (error) {
      console.log("⚠️  Search failed:", error instanceof Error ? error.message : String(error));
    }

    // Test 3: Get specific agent (if you have an agent ID)
    console.log("\n--- Test 3: Get Agent by ID ---");
    const TEST_AGENT_ID = process.env.TEST_AGENT_ID; // e.g., "11155111:1"
    if (TEST_AGENT_ID) {
      try {
        const agentSummary = await sdk.getAgent(TEST_AGENT_ID);
        console.log("✅ Agent found:", agentSummary);
      } catch (error) {
        console.log("⚠️  Get agent failed:", error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log("⚠️  No TEST_AGENT_ID provided, skipping");
    }

    // Test 4: Load Agent (if you have an agent ID)
    console.log("\n--- Test 4: Load Agent (full) ---");
    if (TEST_AGENT_ID) {
      try {
        const loadedAgent = await sdk.loadAgent(TEST_AGENT_ID);
        console.log("✅ Agent loaded:", loadedAgent);
      } catch (error) {
        console.log("⚠️  Load agent failed:", error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log("⚠️  No TEST_AGENT_ID provided, skipping");
    }

    // Test 5: Search by reputation
    console.log("\n--- Test 5: Search Agents by Reputation ---");
    try {
      const reputationResult = await sdk.searchAgentsByReputation(
        undefined, // agents
        undefined, // tags
        undefined, // reviewers
        undefined, // capabilities
        undefined, // skills
        undefined, // tasks
        undefined, // names
        undefined, // minAverageScore
        false, // includeRevoked
        10 // pageSize
      );
      console.log(`✅ Found ${reputationResult.items.length} agents with reputation`);
      if (reputationResult.items.length > 0) {
        console.log("First agent:", reputationResult.items[0]);
      }
    } catch (error) {
      console.log("⚠️  Reputation search failed:", error instanceof Error ? error.message : String(error));
    }

    // Test 6: Search Feedback (if you have an agent ID)
    console.log("\n--- Test 6: Search Feedback ---");
    if (TEST_AGENT_ID) {
      try {
        const feedbacks = await sdk.searchFeedback(TEST_AGENT_ID);
        console.log(`✅ Found ${feedbacks.length} feedbacks`);
        if (feedbacks.length > 0) {
          console.log("First feedback:", feedbacks[0]);
        }
      } catch (error) {
        console.log("⚠️  Feedback search failed:", error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log("⚠️  No TEST_AGENT_ID provided, skipping");
    }

    // Test 7: Get Reputation Summary (if you have an agent ID)
    console.log("\n--- Test 7: Get Reputation Summary ---");
    if (TEST_AGENT_ID) {
      try {
        const summary = await sdk.getReputationSummary(TEST_AGENT_ID);
        console.log("✅ Reputation summary:", summary);
      } catch (error) {
        console.log("⚠️  Reputation summary failed:", error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log("⚠️  No TEST_AGENT_ID provided, skipping");
    }

    // Write operations (only if signer is provided)
    if (!sdk.isReadOnly) {
      console.log("\n--- Write Operations (with signer) ---");
      
      // Test 8: Prepare feedback
      console.log("\n--- Test 8: Prepare Feedback ---");
      if (TEST_AGENT_ID) {
        const feedbackFile = sdk.prepareFeedback(
          TEST_AGENT_ID,
          5, // score
          ["test", "positive"], // tags
          "Great agent!", // text
          "chat", // capability
          "Test Agent", // name
          "conversation", // skill
          "test task", // task
          { sessionId: "test-session-123" }, // context
          undefined, // proofOfPayment
          { testData: true } // extra
        );
        console.log("✅ Feedback prepared:", feedbackFile);
      } else {
        console.log("⚠️  No TEST_AGENT_ID provided, skipping");
      }

      // Note: Actual write operations (giveFeedback, transferAgent, etc.) 
      // require valid agent IDs and may incur gas costs
      console.log("\n⚠️  Skipping actual write transactions to avoid gas costs");
      console.log("   To test write operations, uncomment the code and provide valid parameters");
      
      /*
      // Test 9: Give Feedback (requires gas)
      if (TEST_AGENT_ID) {
        try {
          const feedback = await sdk.giveFeedback(TEST_AGENT_ID, feedbackFile);
          console.log("✅ Feedback given:", feedback);
        } catch (error) {
          console.log("⚠️  Give feedback failed:", error.message);
        }
      }
      */
    }

    console.log("\n=== Test Suite Completed ===");
    
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
};

main();
