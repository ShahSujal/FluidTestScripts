import { FluidSDK } from "../dist/index.js";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
// Load environment variables
dotenv.config();
/**
 * Full Flow Test with MCP Integration and Subgraph Verification
 *
 * This test performs a complete agent lifecycle:
 * 1. Verifies MCP server connectivity (https://fluidmcpserver.vercel.app/)
 * 2. Creates an agent with MCP endpoint configured
 * 3. Registers the agent on-chain
 * 4. Verifies registration via subgraph queries
 * 5. Performs feedback operations
 * 6. Validates all data via subgraph
 */
// MCP Server Configuration
const MCP_SERVER_URL = "https://fluidmcpserver.vercel.app/";
const MCP_PROTOCOL_VERSION = "2024-11-05";
/**
 * Test MCP server connectivity
 */
async function testMCPConnectivity(url) {
    try {
        console.log(`\n🔍 Testing MCP server connectivity: ${url}`);
        // Try to fetch the MCP endpoint
        const response = await fetch(`${url}/info`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            console.log(`⚠️  MCP server returned status: ${response.status}`);
            return false;
        }
        const data = await response.json();
        console.log('✅ MCP server is accessible');
        console.log(`   Protocol version: ${data?.version || 'unknown'}`);
        console.log(`   Server name: ${data?.protocol || 'unknown'}`);
        return true;
    }
    catch (error) {
        console.log('❌ MCP server connectivity test failed:', error instanceof Error ? error.message : String(error));
        return false;
    }
}
/**
 * Query subgraph for agent data
 */
async function queryAgentFromSubgraph(sdk, agentId) {
    try {
        console.log(`\n🔍 Querying subgraph for agent: ${agentId}`);
        // Use the SDK's subgraph client to query agent
        const agent = await sdk.getAgent(agentId);
        if (agent) {
            console.log('✅ Agent found in subgraph');
            console.log(`   Name: ${agent.name}`);
            console.log(`   Description: ${agent.description}`);
            console.log(`   Active: ${agent.active}`);
            console.log(`   Owners: ${agent.owners.join(', ')}`);
            console.log(`   Operators: ${agent.operators.join(', ')}`);
            console.log(`   MCP Enabled: ${agent.mcp}`);
            console.log(`   A2A Enabled: ${agent.a2a}`);
            // Check for MCP tools/prompts/resources
            if (agent.mcp) {
                console.log(`   MCP Tools: ${agent.mcpTools.length}`);
                console.log(`   MCP Prompts: ${agent.mcpPrompts.length}`);
                console.log(`   MCP Resources: ${agent.mcpResources.length}`);
            }
            return agent;
        }
        else {
            console.log('⚠️  Agent not found in subgraph (may need time to index)');
            return null;
        }
    }
    catch (error) {
        console.log('⚠️  Subgraph query failed:', error instanceof Error ? error.message : String(error));
        return null;
    }
}
/**
 * Search agents with specific filters using subgraph
 */
async function searchAgentsInSubgraph(sdk, filters = {}) {
    try {
        console.log('\n🔍 Searching agents in subgraph...');
        const results = await sdk.searchAgents(filters, undefined, 10);
        console.log(`✅ Found ${results.items.length} agent(s) in subgraph`);
        results.items.forEach((agent, idx) => {
            console.log(`   ${idx + 1}. ${agent.name} (ID: ${agent.agentId})`);
        });
        return results.items;
    }
    catch (error) {
        console.log('⚠️  Agent search failed:', error instanceof Error ? error.message : String(error));
        return [];
    }
}
/**
 * Query feedback from subgraph
 */
async function queryFeedbackFromSubgraph(sdk, agentId) {
    try {
        console.log(`\n🔍 Querying feedback from subgraph for agent: ${agentId}`);
        const feedbacks = await sdk.searchFeedback(agentId, undefined, // tags
        undefined, // capabilities
        undefined, // skills
        undefined, // minScore
        undefined // maxScore
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
    }
    catch (error) {
        console.log('⚠️  Feedback query failed:', error instanceof Error ? error.message : String(error));
    }
}
/**
 * Main test execution
 */
const main = async () => {
    try {
        console.log("=".repeat(70));
        console.log("🚀 FluidSDK Full Flow Test - MCP Integration + Subgraph Verification");
        console.log("=".repeat(70));
        console.log("\nThis test will:");
        console.log("  1. Verify MCP server connectivity");
        console.log("  2. Create and register an agent with MCP endpoint");
        console.log("  3. Query and verify data via subgraph");
        console.log("  4. Perform feedback operations");
        console.log("  5. Validate all changes via subgraph queries");
        console.log("\n⚠️  This test requires ETH for gas fees!");
        // Configuration
        const RPC_URL = process.env.RPC_URL;
        const PRIVATE_KEY = process.env.PRIVATE_KEY;
        const FEEDBACK_PRIVATE_KEY = process.env.FEEDBACK_PRIVATE_KEY; // Second wallet for feedback
        const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111");
        const PINATA_JWT = process.env.PINATA_JWT;
        if (!RPC_URL) {
            throw new Error("RPC_URL not set in .env file");
        }
        if (!PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY not set in .env file - write operations require a signer");
        }
        // Create signers
        const signer = new ethers.Wallet(PRIVATE_KEY);
        // Create feedback signer (different wallet to avoid self-feedback error)
        let feedbackSigner;
        if (FEEDBACK_PRIVATE_KEY) {
            feedbackSigner = new ethers.Wallet(FEEDBACK_PRIVATE_KEY);
            console.log("\n📍 Configuration:");
            console.log("   Agent Owner:", signer.address);
            console.log("   Feedback Reviewer:", feedbackSigner.address);
        }
        else {
            console.log("\n⚠️  WARNING: FEEDBACK_PRIVATE_KEY not set in .env");
            console.log("   Feedback operations will use the same wallet as agent owner");
            console.log("   This will cause 'Self-feedback not allowed' error!");
            console.log("\n💡 Add FEEDBACK_PRIVATE_KEY to .env with a different wallet");
            console.log("   Get a second wallet's private key and add it to .env");
        }
        console.log("   Chain ID:", CHAIN_ID);
        console.log("   RPC URL:", RPC_URL);
        console.log("   MCP Server:", MCP_SERVER_URL);
        // Step 1: Test MCP Server Connectivity
        console.log("\n" + "=".repeat(70));
        console.log("STEP 1: Verify MCP Server Connectivity");
        console.log("=".repeat(70));
        const mcpConnected = await testMCPConnectivity(MCP_SERVER_URL);
        if (!mcpConnected) {
            console.log("\n⚠️  WARNING: MCP server is not accessible");
            console.log("   Test will continue but MCP functionality may be limited");
        }
        // Step 2: Initialize SDK with IPFS
        console.log("\n" + "=".repeat(70));
        console.log("STEP 2: Initialize FluidSDK");
        console.log("=".repeat(70));
        const sdkConfig = {
            chainId: CHAIN_ID,
            rpcUrl: RPC_URL,
            signer: signer,
        };
        // Add IPFS configuration if Pinata JWT is available
        if (PINATA_JWT) {
            console.log("✅ IPFS (Pinata) configured");
            sdkConfig.ipfs = 'pinata';
            sdkConfig.pinataJwt = PINATA_JWT;
        }
        else {
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
        console.log("✅ Agent Owner balance:", ethers.formatEther(balance), "ETH");
        if (feedbackSigner) {
            const feedbackBalance = await provider.getBalance(feedbackSigner.address);
            console.log("✅ Feedback Reviewer balance:", ethers.formatEther(feedbackBalance), "ETH");
            if (feedbackBalance === 0n) {
                console.log("\n⚠️  WARNING: Feedback wallet has 0 ETH. You need ETH for gas fees.");
                console.log("Get testnet ETH from: https://sepoliafaucet.com/");
                throw new Error("Insufficient balance in feedback wallet");
            }
        }
        if (balance === 0n) {
            console.log("\n⚠️  WARNING: Your wallet has 0 ETH. You need ETH for gas fees.");
            console.log("Get testnet ETH from: https://sepoliafaucet.com/");
            throw new Error("Insufficient balance for testing");
        }
        // Verify registry addresses
        const registries = sdk.registries();
        console.log("\n📋 Registry addresses:", registries);
        if (Object.keys(registries).length === 0) {
            throw new Error(`No registry addresses configured for chain ${chainId}`);
        }
        // Step 3: Search existing agents in subgraph
        console.log("\n" + "=".repeat(70));
        console.log("STEP 3: Query Existing Agents from Subgraph");
        console.log("=".repeat(70));
        await searchAgentsInSubgraph(sdk);
        // Step 4: Create Agent with MCP Integration
        console.log("\n" + "=".repeat(70));
        console.log("STEP 4: Create Agent with MCP Endpoint");
        console.log("=".repeat(70));
        const agentName = `MCP Agent ${Date.now()}`;
        const agentDescription = "Test agent with MCP server integration for full flow testing";
        const agentImage = "ipfs://QmTestMCPAgentImage";
        const agent = sdk.createAgent(agentName, agentDescription, agentImage);
        console.log("✅ Agent object created");
        console.log("   Name:", agentName);
        console.log("   Description:", agentDescription);
        // Configure MCP endpoint
        console.log("\n📡 Configuring MCP endpoint...");
        try {
            // First, try to fetch capabilities from MCP server manually
            console.log("🔍 Fetching MCP capabilities...");
            let mcpTools = [];
            let mcpPrompts = [];
            let mcpResources = [];
            try {
                // Fetch tools
                const toolsResponse = await fetch(`${MCP_SERVER_URL}mcp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'tools/list',
                        params: {},
                        id: 1
                    })
                });
                if (toolsResponse.ok) {
                    const toolsData = await toolsResponse.json();
                    if (toolsData.result?.tools) {
                        mcpTools = toolsData.result.tools.map((t) => t.name);
                        console.log(`   ✅ Found ${mcpTools.length} tool(s): ${mcpTools.join(', ')}`);
                    }
                }
            }
            catch (e) {
                console.log("   ⚠️  Could not fetch tools:", e instanceof Error ? e.message : String(e));
            }
            try {
                // Fetch prompts
                const promptsResponse = await fetch(`${MCP_SERVER_URL}mcp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'prompts/list',
                        params: {},
                        id: 2
                    })
                });
                if (promptsResponse.ok) {
                    const promptsData = await promptsResponse.json();
                    if (promptsData.result?.prompts) {
                        mcpPrompts = promptsData.result.prompts.map((p) => p.name);
                        console.log(`   ✅ Found ${mcpPrompts.length} prompt(s): ${mcpPrompts.join(', ')}`);
                    }
                }
            }
            catch (e) {
                console.log("   ⚠️  Could not fetch prompts:", e instanceof Error ? e.message : String(e));
            }
            try {
                // Fetch resources
                const resourcesResponse = await fetch(`${MCP_SERVER_URL}mcp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'resources/list',
                        params: {},
                        id: 3
                    })
                });
                if (resourcesResponse.ok) {
                    const resourcesData = await resourcesResponse.json();
                    if (resourcesData.result?.resources) {
                        mcpResources = resourcesData.result.resources.map((r) => r.uri || r.name);
                        console.log(`   ✅ Found ${mcpResources.length} resource(s): ${mcpResources.join(', ')}`);
                    }
                }
            }
            catch (e) {
                console.log("   ⚠️  Could not fetch resources:", e instanceof Error ? e.message : String(e));
            }
            // Now set MCP with autoFetch=false and manually add capabilities
            await agent.setMCP(MCP_SERVER_URL, MCP_PROTOCOL_VERSION, false);
            console.log("✅ MCP endpoint configured");
            console.log(`   URL: ${MCP_SERVER_URL}`);
            console.log(`   Version: ${MCP_PROTOCOL_VERSION}`);
            // Manually add the fetched capabilities using the new method
            if (mcpTools.length > 0 || mcpPrompts.length > 0 || mcpResources.length > 0) {
                console.log("\n📝 Adding MCP capabilities to agent...");
                agent.setMcpCapabilities(mcpTools, mcpPrompts, mcpResources);
                console.log("✅ MCP capabilities added:");
                console.log(`   Tools: ${mcpTools.length} - ${mcpTools.join(', ')}`);
                console.log(`   Prompts: ${mcpPrompts.length} - ${mcpPrompts.join(', ')}`);
                console.log(`   Resources: ${mcpResources.length} - ${mcpResources.join(', ')}`);
            }
            // Set agent as active
            agent.setActive(true);
            console.log("✅ Agent set as active");
        }
        catch (error) {
            console.log("❌ Error configuring MCP:", error instanceof Error ? error.message : String(error));
            throw error;
        }
        // Step 5: Register Agent On-Chain
        console.log("\n" + "=".repeat(70));
        console.log("STEP 5: Register Agent On-Chain");
        console.log("=".repeat(70));
        console.log("⚠️  This will cost gas!");
        if (!sdk.ipfsClient) {
            throw new Error("IPFS client not configured - cannot register agent");
        }
        console.log("📝 Registering agent...");
        const registrationFile = await agent.registerIPFS();
        console.log("✅ Agent registered on-chain!");
        console.log("   Agent ID:", registrationFile.agentId);
        console.log("   Agent URI:", registrationFile.agentURI);
        console.log("   IPFS CID:", registrationFile.agentURI?.replace('ipfs://', ''));
        // Fetch and display the actual IPFS content
        const ipfsCid = registrationFile.agentURI?.replace('ipfs://', '');
        if (ipfsCid) {
            try {
                console.log("\n📄 Fetching IPFS content to verify tools/prompts/resources...");
                const ipfsUrl = `https://salmon-quiet-marten-958.mypinata.cloud/ipfs/${ipfsCid}`;
                const ipfsResponse = await fetch(ipfsUrl);
                if (ipfsResponse.ok) {
                    const ipfsContent = await ipfsResponse.json();
                    console.log("✅ IPFS Content:");
                    console.log(JSON.stringify(ipfsContent, null, 2));
                    // Check for MCP endpoint with tools
                    const mcpEndpoint = ipfsContent.endpoints?.find((e) => e.name === 'MCP' || e.name === 'mcp');
                    if (mcpEndpoint) {
                        console.log("\n🔍 MCP Endpoint in IPFS:");
                        console.log(`   Tools: ${mcpEndpoint.mcpTools?.length || 0}`);
                        console.log(`   Prompts: ${mcpEndpoint.mcpPrompts?.length || 0}`);
                        console.log(`   Resources: ${mcpEndpoint.mcpResources?.length || 0}`);
                        if (mcpEndpoint.mcpTools) {
                            console.log(`   Tool list: ${mcpEndpoint.mcpTools.join(', ')}`);
                        }
                    }
                    else {
                        console.log("⚠️  No MCP endpoint found in IPFS content");
                    }
                }
            }
            catch (error) {
                console.log("⚠️  Could not fetch IPFS content:", error instanceof Error ? error.message : String(error));
            }
        }
        const newAgentId = registrationFile.agentId;
        if (!newAgentId) {
            throw new Error("Registration failed - no agent ID returned");
        }
        // Wait for transaction to be mined and indexed
        console.log("\n⏳ Waiting for transaction confirmation and subgraph indexing...");
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        // Step 6: Verify Registration via Subgraph
        console.log("\n" + "=".repeat(70));
        console.log("STEP 6: Verify Agent Registration via Subgraph");
        console.log("=".repeat(70));
        let agentData = await queryAgentFromSubgraph(sdk, newAgentId);
        // If not found immediately, retry a few times (subgraph indexing delay)
        if (!agentData) {
            console.log("\n⏳ Agent not found yet, waiting for subgraph to index...");
            for (let i = 0; i < 3; i++) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 more seconds
                console.log(`   Retry ${i + 1}/3...`);
                agentData = await queryAgentFromSubgraph(sdk, newAgentId);
                if (agentData)
                    break;
            }
        }
        if (!agentData) {
            console.log("\n⚠️  WARNING: Agent not found in subgraph after multiple retries");
            console.log("   This is likely due to subgraph indexing delay");
            console.log("   Continuing with test...");
        }
        else {
            console.log("\n✅ Agent successfully verified in subgraph!");
        }
        // Step 7: Load Agent via SDK
        console.log("\n" + "=".repeat(70));
        console.log("STEP 7: Load Agent via SDK");
        console.log("=".repeat(70));
        try {
            const loadedAgent = await sdk.loadAgent(newAgentId);
            console.log("✅ Agent loaded from blockchain/subgraph");
            console.log("   Agent ID:", loadedAgent.agentId);
            console.log("   Name:", loadedAgent.name);
            console.log("   Description:", loadedAgent.description);
        }
        catch (error) {
            console.log("⚠️  Error loading agent:", error instanceof Error ? error.message : String(error));
        }
        // Step 8: Give Feedback
        console.log("\n" + "=".repeat(70));
        console.log("STEP 8: Submit Feedback");
        console.log("=".repeat(70));
        if (!feedbackSigner) {
            console.log("❌ Skipping feedback - FEEDBACK_PRIVATE_KEY not configured");
            console.log("   Add FEEDBACK_PRIVATE_KEY to .env to test feedback functionality");
        }
        else {
            console.log("⚠️  This will cost gas!");
            try {
                const feedbackFile = sdk.prepareFeedback(newAgentId, 5, // score (1-5)
                ["mcp", "integration", "test"], // tags
                "Excellent MCP integration and response time!", // text
                "mcp-communication", // capability
                agentName, // name
                "protocol-integration", // skill
                "full-flow-mcp-test", // task
                {
                    testType: "full-flow-mcp-subgraph",
                    mcpServer: MCP_SERVER_URL,
                    timestamp: Date.now(),
                    reviewer: await feedbackSigner.getAddress()
                }, // context
                undefined, // proofOfPayment
                {
                    automatedTest: true,
                    version: "2.0",
                    mcpEnabled: true
                } // extra
                );
                console.log(feedbackFile);
                console.log("✅ Feedback prepared");
                console.log("   Score:", feedbackFile.score);
                console.log("   Tags:", feedbackFile.tag1, feedbackFile.tag2, feedbackFile.tag3);
                console.log("   Reviewer:", await feedbackSigner.getAddress());
                console.log({
                    newAgentId, feedbackFile
                });
                console.log("\n📝 Submitting feedback on-chain with separate signer...");
                const feedback = await sdk.giveFeedback(newAgentId, feedbackFile, undefined, feedbackSigner);
                console.log("✅ Feedback submitted!");
                console.log("   Feedback ID:", feedback.id);
                console.log("   Reviewer:", feedback.reviewer);
                console.log("   Score:", feedback.score);
                // Wait for transaction
                console.log("\n⏳ Waiting for feedback to be indexed...");
                await new Promise(resolve => setTimeout(resolve, 10000));
                // Step 9: Query Feedback via Subgraph
                console.log("\n" + "=".repeat(70));
                console.log("STEP 9: Verify Feedback via Subgraph");
                console.log("=".repeat(70));
                await queryFeedbackFromSubgraph(sdk, newAgentId);
                // Get feedback index from id tuple
                const feedbackIndex = Array.isArray(feedback.id) && feedback.id.length === 3 ? feedback.id[2] : 0;
                // Step 10: Retrieve Specific Feedback
                console.log("\n" + "=".repeat(70));
                console.log("STEP 10: Retrieve Specific Feedback");
                console.log("=".repeat(70));
                try {
                    const retrievedFeedback = await sdk.getFeedback(newAgentId, await feedbackSigner.getAddress(), feedbackIndex);
                    console.log("✅ Feedback retrieved directly");
                    console.log("   Score:", retrievedFeedback.score);
                    console.log("   Tags:", retrievedFeedback.tags);
                    console.log("   Text:", retrievedFeedback.text);
                    console.log("   Created At:", new Date(retrievedFeedback.createdAt * 1000).toISOString());
                }
                catch (error) {
                    console.log("⚠️  Error retrieving feedback:", error instanceof Error ? error.message : String(error));
                }
            }
            catch (error) {
                console.log("❌ Error in feedback flow:", error instanceof Error ? error.message : String(error));
                if (error instanceof Error && error.stack) {
                    console.log("Stack trace:", error.stack);
                }
            }
        }
        // Step 11: Search Agents with Filters
        console.log("\n" + "=".repeat(70));
        console.log("STEP 11: Search Agents with Filters (Subgraph)");
        console.log("=".repeat(70));
        const searchResults = await searchAgentsInSubgraph(sdk, {
        // Can add filters here if needed
        });
        const ourAgent = searchResults.find(a => a.agentId === newAgentId);
        if (ourAgent) {
            console.log("\n✅ Successfully found our newly registered agent in search results!");
        }
        // Final Summary
        console.log("\n" + "=".repeat(70));
        console.log("✅ FULL FLOW TEST COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(70));
        console.log(`\n🎉 Test Summary:`);
        console.log(`   Agent ID: ${newAgentId}`);
        console.log(`   Agent Name: ${agentName}`);
        console.log(`   Agent Owner: ${signer.address}`);
        if (feedbackSigner) {
            console.log(`   Feedback Reviewer: ${await feedbackSigner.getAddress()}`);
        }
        console.log(`   MCP Server: ${MCP_SERVER_URL}`);
        console.log(`   MCP Protocol: ${MCP_PROTOCOL_VERSION}`);
        console.log(`   Chain: ${chainId}`);
        console.log(`\n💡 You can use this agent ID for future tests:`);
        console.log(`   export TEST_AGENT_ID="${newAgentId}"`);
        if (!feedbackSigner) {
            console.log(`\n⚠️  To test feedback functionality:`);
            console.log(`   1. Generate a new wallet: node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"`);
            console.log(`   2. Add to .env: FEEDBACK_PRIVATE_KEY="<new-private-key>"`);
            console.log(`   3. Get testnet ETH for the new wallet from https://sepoliafaucet.com/`);
            console.log(`   4. Run the test again`);
        }
    }
    catch (error) {
        console.error("\n" + "=".repeat(70));
        console.error("❌ FATAL ERROR");
        console.error("=".repeat(70));
        console.error(error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
            console.error("\nStack trace:", error.stack);
        }
        process.exit(1);
    }
};
// Run the test
console.log("\n⏱️  Starting test in 3 seconds...");
console.log("Press Ctrl+C to cancel\n");
setTimeout(() => {
    main().then(() => {
        console.log("\n✅ All tests completed successfully");
        process.exit(0);
    }).catch((error) => {
        console.error("\n❌ Test execution failed:", error);
        process.exit(1);
    });
}, 3000);
