import { ethers } from "ethers";
import { FluidSDK } from "fluidsdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const mainnam = async () => {
  const FEEDBACK_PRIVATE_KEY = process.env.FEEDBACK_PRIVATE_KEY; // Second wallet for feedback
  const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111");
  const PINATA_JWT = process.env.PINATA_JWT;
  const RPC_URL = process.env.RPC_URL;

  if (!RPC_URL) {
    throw new Error("RPC_URL not set in .env file");
  }

  if (!FEEDBACK_PRIVATE_KEY) {
    throw new Error(
      "FEEDBACK_PRIVATE_KEY not set in .env file - write operations require a signer"
    );
  }

  // Create signers
  const signer = new ethers.Wallet(FEEDBACK_PRIVATE_KEY);
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

  async function queryFeedbackFromSubgraph(sdk: FluidSDK, agentId: string): Promise<void> {
    try {
      console.log(`\n🔍 Querying feedback from subgraph for agent: ${agentId}`);
      
      const feedbacks = await sdk.searchFeedback(
        agentId,
        undefined, // tags
        undefined, // capabilities
        undefined, // skills
        undefined, // minScore
        undefined  // maxScore
      );
      
      console.log(`✅ Found ${feedbacks.length} feedback(s) in subgraph`);
      feedbacks.forEach((fb, idx) => {
        console.log(`   ${idx + 1}. Score: ${fb.score}, Tags: ${fb.tags}, Reviewer: ${fb.reviewer}`);
      });
      
      // Get reputation summary
      const reputation = await sdk.getReputationSummary(agentId);
      console.log(`\n📊 Reputation Summary (via subgraph):`);
      console.log(`   Total Feedback: ${reputation.count}`);
      console.log(`   Average Score: ${reputation.averageScore}`);
      
    } catch (error) {
      console.log('⚠️  Feedback query failed:', error instanceof Error ? error.message : String(error));
    }
  }
  console.log("✅ SDK initialized");

  // Wait for chain initialization
  const chainId = await sdk.chainId();
  const data = {
    newAgentId: "11155111:1555",
    feedbackFile: {
  "agentRegistry": "eip155:11155111:0x0",
  "agentId": 1555,
  "clientAddress": "eip155:11155111:0x1059Ed65AD58ffc83642C9Be3f24C250905a28FB",
  "createdAt": "2025-11-11T09:32:55.281Z",
  "feedbackAuth": "0x00000000000000000000000000000000000000000000000000000000000006130000000000000000000000001059ed65ad58ffc83642c9be3f24c250905a28fb000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000691454480000000000000000000000000000000000000000000000000000000000aa36a70000000000000000000000008004a6090cd10a7288092483047b097295fb88470000000000000000000000001059ed65ad58ffc83642c9be3f24c250905a28fb5d516a107a02312069463d4630fc7cc285fc6d699a016f2d580cf72dcf6594093365c568510959450ed9631943769d8bd0eaf8ede6dccb417a2835d56e05d5c11b",
  "score": 5,
  "tag1": "mcp",
  "tag2": "integration",
  "skill": "protocol-integration",
  "context": {
    "testType": "full-flow-mcp-subgraph",
    "mcpServer": "https://fluidmcpserver.vercel.app/",
    "timestamp": 1762853575280,
    "tester": "0x1059Ed65AD58ffc83642C9Be3f24C250905a28FB"
  },
  "task": "full-flow-mcp-test",
  "capability": "mcp-communication",
  "name": "MCP Agent 1762853521295",
  "automatedTest": true,
  "version": "2.0",
  "mcpEnabled": true
},
  };

  console.log("\n📝 Submitting feedback on-chain with separate signer...");
  const feedback = await sdk.giveFeedback(
    data.newAgentId,
    data.feedbackFile,
    "0x00000000000000000000000000000000000000000000000000000000000006130000000000000000000000001059ed65ad58ffc83642c9be3f24c250905a28fb000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000691454480000000000000000000000000000000000000000000000000000000000aa36a70000000000000000000000008004a6090cd10a7288092483047b097295fb88470000000000000000000000001059ed65ad58ffc83642c9be3f24c250905a28fb5d516a107a02312069463d4630fc7cc285fc6d699a016f2d580cf72dcf6594093365c568510959450ed9631943769d8bd0eaf8ede6dccb417a2835d56e05d5c11b",
  );

    console.log("\n✅ Feedback submitted successfully!");


       
        // Wait for transaction
        console.log("\n⏳ Waiting for feedback to be indexed...");
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Step 9: Query Feedback via Subgraph
        console.log("\n" + "=".repeat(70));
        console.log("STEP 9: Verify Feedback via Subgraph");
        console.log("=".repeat(70));
        
        await queryFeedbackFromSubgraph(sdk, data.newAgentId);

        // Get feedback index from id tuple
        const feedbackIndex = Array.isArray(feedback.id) && feedback.id.length === 3 ? feedback.id[2] : 0;

        // Step 10: Retrieve Specific Feedback
        console.log("\n" + "=".repeat(70));
        console.log("STEP 10: Retrieve Specific Feedback");
        console.log("=".repeat(70));


         
        try {
          const retrievedFeedback = await sdk.getFeedback(
            data.newAgentId,
            await signer.getAddress(),
            feedbackIndex
          );
          console.log("✅ Feedback retrieved directly");
          console.log("   Score:", retrievedFeedback.score);
          console.log("   Tags:", retrievedFeedback.tags);
          console.log("   Text:", retrievedFeedback.text);
          console.log("   Created At:", new Date(retrievedFeedback.createdAt * 1000).toISOString());
        } catch (error) {
          console.log("⚠️  Error retrieving feedback:", error instanceof Error ? error.message : String(error));
        }

        
};


mainnam().catch((error) => {
  console.error("❌ Error in testfeedback script:", error);
  process.exit(1);
});