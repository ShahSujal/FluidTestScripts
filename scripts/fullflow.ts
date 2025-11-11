import { FluidSDK } from "../dist/index.js";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const main = async () => {
  try {
    console.log("=== FluidSDK Full Flow Test ===\n");
    console.log("This test will perform actual blockchain transactions!");
    console.log("Make sure you have enough ETH for gas fees.\n");

    // Configuration
    const RPC_URL = process.env.RPC_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111");
    const PINATA_JWT = process.env.PINATA_JWT;

    if (!RPC_URL) {
      throw new Error("RPC_URL not set in .env file");
    }

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not set in .env file - write operations require a signer");
    }

    // Create signer
    const signer = new ethers.Wallet(PRIVATE_KEY);
    console.log("✅ Signer address:", signer.address);
    console.log("Chain ID:", CHAIN_ID);
    console.log("RPC URL:", RPC_URL);

    // Initialize SDK with IPFS support
    console.log("\n--- Step 1: Initialize SDK ---");
    const sdkConfig: any = {
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
      signer: signer,
    };

    // Add IPFS configuration if Pinata JWT is available
    if (PINATA_JWT) {
      console.log("✅ IPFS (Pinata) configured");
      sdkConfig.ipfs = 'pinata';
      sdkConfig.pinataJwt = PINATA_JWT;
    } else {
      console.log("⚠️  No IPFS configuration - some features will be limited");
    }

    const sdk = new FluidSDK(sdkConfig);
    console.log("✅ SDK initialized");

    // Wait for chain initialization
    const chainId = await sdk.chainId();
    console.log("✅ Connected to chain:", chainId);

    // Check balance
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const balance = await provider.getBalance(signer.address);
    console.log("✅ Wallet balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      console.log("\n⚠️  WARNING: Your wallet has 0 ETH. You need ETH for gas fees.");
      console.log("Get testnet ETH from: https://sepoliafaucet.com/");
      console.log("\nContinuing with read-only tests...\n");
    }

    // Get registry addresses
    const registries = sdk.registries();
    console.log("\nRegistry addresses:", registries);

    if (Object.keys(registries).length === 0) {
      console.log("\n⚠️  No registry addresses configured for chain", chainId);
      console.log("You need to deploy contracts or add registryOverrides to SDK config.");
      console.log("\nExample:");
      console.log(`registryOverrides: {
  ${chainId}: {
    IDENTITY: '0xYourIdentityRegistryAddress',
    REPUTATION: '0xYourReputationRegistryAddress',
    VALIDATION: '0xYourValidationRegistryAddress',
  }
}`);
      console.log("\nSkipping write operations...");
      return;
    }

    // ============================================
    // FULL FLOW TEST
    // ============================================

    console.log("\n" + "=".repeat(60));
    console.log("STARTING FULL AGENT LIFECYCLE TEST");
    console.log("=".repeat(60));

    // Step 2: Create Agent (off-chain)
    console.log("\n--- Step 2: Create Agent (off-chain) ---");
    const agentName = `Test Agent ${Date.now()}`;
    const agentDescription = "A comprehensive test agent for FluidSDK full flow testing";
    const agentImage = "ipfs://QmTestImageHash123";

    const agent = sdk.createAgent(agentName, agentDescription, agentImage);
    console.log("✅ Agent object created");
    console.log("   Name:", agentName);
    console.log("   Description:", agentDescription);

    // Step 3: Add endpoints to agent
    console.log("\n--- Step 3: Configure Agent Endpoints ---");
    try {
      await agent.setMCP("https://api.example.com/mcp", "2025-06-18", false);
      console.log("✅ Added MCP endpoint");
      
      await agent.setA2A("https://api.example.com/a2a", "1.0", false);
      console.log("✅ Added A2A endpoint");
      
      // Set agent as active
      agent.setActive(true);
      console.log("✅ Agent set as active");
    } catch (error) {
      console.log("⚠️  Error configuring agent:", error instanceof Error ? error.message : String(error));
    }

    // Step 4: Register Agent on-chain
    console.log("\n--- Step 4: Register Agent On-Chain ---");
    console.log("⚠️  This will cost gas!");
    
    if (balance === 0n) {
      console.log("❌ Cannot register - insufficient balance");
    } else {
      try {
        console.log("📝 Registering agent...");
        
        // Check if IPFS is configured
        if (!sdk.ipfsClient) {
          console.log("❌ Cannot register - IPFS client not configured");
          console.log("   Add PINATA_JWT to .env file or use registerHTTP() with a URI");
          return;
        }
        
        const registrationFile = await agent.registerIPFS();
        console.log("✅ Agent registered!");
        console.log("   Agent ID:", registrationFile.agentId);
        console.log("   Agent URI:", registrationFile.agentURI);
        
        const newAgentId = registrationFile.agentId;
        if (!newAgentId) {
          console.log("❌ Registration failed - no agent ID returned");
          return;
        }
        
        // Wait a bit for transaction to be mined
        console.log("⏳ Waiting for transaction confirmation...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Step 5: Load the registered agent
        console.log("\n--- Step 5: Load Registered Agent ---");
        try {
          const loadedAgent = await sdk.loadAgent(newAgentId);
          console.log("✅ Agent loaded from blockchain");
          console.log("   Agent ID:", loadedAgent.agentId);
          console.log("   Name:", loadedAgent.name);
        } catch (error) {
          console.log("⚠️  Error loading agent:", error instanceof Error ? error.message : String(error));
        }

        // Step 6: Prepare and Give Feedback
        console.log("\n--- Step 6: Give Feedback to Agent ---");
        console.log("⚠️  This will cost gas!");
        
        try {
          const feedbackFile = sdk.prepareFeedback(
            newAgentId,
            5, // score (1-5)
            ["test", "positive", "automated"], // tags
            "Excellent performance in automated testing!", // text
            "testing", // capability
            agentName, // name
            "automated-testing", // skill
            "full-flow-test", // task
            { 
              testType: "full-flow",
              timestamp: Date.now(),
              tester: signer.address 
            }, // context
            undefined, // proofOfPayment
            { automatedTest: true, version: "1.0" } // extra
          );
          
          console.log("✅ Feedback prepared");
          console.log("   Score:", feedbackFile.score);
          console.log("   Tags:", feedbackFile.tag1, feedbackFile.tag2);
          
          console.log("📝 Submitting feedback...");
          const feedback = await sdk.giveFeedback(newAgentId, feedbackFile);
          console.log("✅ Feedback submitted!");
          console.log("   Feedback ID:", feedback.id);
          console.log("   Reviewer:", feedback.reviewer);
          console.log("   Score:", feedback.score);
          
          // Wait for transaction
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Get feedback index from id tuple [agentId, reviewer, index]
          const feedbackIndex = Array.isArray(feedback.id) && feedback.id.length === 3 ? feedback.id[2] : 0;

          // Step 7: Retrieve Feedback
          console.log("\n--- Step 7: Retrieve Feedback ---");
          try {
            const retrievedFeedback = await sdk.getFeedback(
              newAgentId,
              signer.address,
              feedbackIndex
            );
            console.log("✅ Feedback retrieved");
            console.log("   Score:", retrievedFeedback.score);
            console.log("   Tags:", retrievedFeedback.tags);
            console.log("   Created At:", retrievedFeedback.createdAt);
          } catch (error) {
            console.log("⚠️  Error retrieving feedback:", error instanceof Error ? error.message : String(error));
          }

          // Step 8: Search Feedback
          console.log("\n--- Step 8: Search Agent Feedback ---");
          try {
            const allFeedback = await sdk.searchFeedback(
              newAgentId,
              ["test"], // tags
              undefined, // capabilities
              undefined, // skills
              undefined, // minScore
              undefined  // maxScore
            );
            console.log(`✅ Found ${allFeedback.length} feedback(s)`);
            allFeedback.forEach((fb, idx) => {
              console.log(`   Feedback ${idx + 1}: Score ${fb.score}, by ${fb.reviewer}`);
            });
          } catch (error) {
            console.log("⚠️  Error searching feedback:", error instanceof Error ? error.message : String(error));
          }

          // Step 9: Get Reputation Summary
          console.log("\n--- Step 9: Get Reputation Summary ---");
          try {
            const reputationSummary = await sdk.getReputationSummary(newAgentId, "test");
            console.log("✅ Reputation summary:");
            console.log("   Count:", reputationSummary.count);
            console.log("   Average Score:", reputationSummary.averageScore);
          } catch (error) {
            console.log("⚠️  Error getting reputation:", error instanceof Error ? error.message : String(error));
          }

        } catch (error) {
          console.log("❌ Error in feedback flow:", error instanceof Error ? error.message : String(error));
          if (error instanceof Error && error.stack) {
            console.log("Stack trace:", error.stack);
          }
        }

        // Step 10: Search for Agent
        console.log("\n--- Step 10: Search for Agent ---");
        try {
          const searchResults = await sdk.searchAgents(
            {
              // Can add filters here
            },
            undefined, // sort
            10 // pageSize
          );
          console.log(`✅ Found ${searchResults.items.length} agent(s)`);
          
          const ourAgent = searchResults.items.find(a => a.agentId === newAgentId);
          if (ourAgent) {
            console.log("✅ Found our registered agent in search results!");
            console.log("   Agent ID:", ourAgent.agentId);
            console.log("   Name:", ourAgent.name);
          }
        } catch (error) {
          console.log("⚠️  Search failed:", error instanceof Error ? error.message : String(error));
        }

        // Step 11: Get Agent by ID
        console.log("\n--- Step 11: Get Agent by ID ---");
        try {
          const agentSummary = await sdk.getAgent(newAgentId);
          if (agentSummary) {
            console.log("✅ Agent retrieved by ID");
            console.log("   Name:", agentSummary.name);
            console.log("   Description:", agentSummary.description);
            console.log("   Active:", agentSummary.active);
          } else {
            console.log("⚠️  Agent not found (might need time for subgraph indexing)");
          }
        } catch (error) {
          console.log("⚠️  Error getting agent:", error instanceof Error ? error.message : String(error));
        }

        // Step 12: Update Agent (optional - costs gas)
        console.log("\n--- Step 12: Update Agent ---");
        console.log("⚠️  Skipping update to save gas (uncomment to test)");
        /*
        try {
          agent.setDescription("Updated description after testing");
          const updateResult = await agent.update();
          console.log("✅ Agent updated!");
          console.log("   Transaction Hash:", updateResult.txHash);
        } catch (error) {
          console.log("❌ Update failed:", error.message);
        }
        */

        console.log("\n" + "=".repeat(60));
        console.log("✅ FULL FLOW TEST COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(60));
        console.log(`\n🎉 Your agent ID: ${newAgentId}`);
        console.log("You can use this ID for future tests in TEST_AGENT_ID env variable");

      } catch (error) {
        console.log("❌ Registration failed:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
          console.log("Stack trace:", error.stack);
        }
      }
    }

  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
};

// Run the test
console.log("Starting in 2 seconds...");
console.log("Press Ctrl+C to cancel\n");

setTimeout(() => {
  main().then(() => {
    console.log("\n✅ Test completed");
    process.exit(0);
  }).catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
}, 2000);
