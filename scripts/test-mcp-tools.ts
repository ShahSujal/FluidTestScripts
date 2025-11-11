import { FluidSDK } from "../dist/index.js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Test script for querying agents by MCP tools, prompts, and resources
 */

const main = async () => {
  try {
    console.log("=== MCP Capabilities Query Test ===\n");

    // Configuration
    const RPC_URL = process.env.RPC_URL || "https://ethereum-sepolia.rpc.subquery.network/public";
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111");

    console.log("📍 Configuration:");
    console.log("   Chain ID:", CHAIN_ID);
    console.log("   RPC URL:", RPC_URL);

    // Initialize SDK (read-only, no signer needed)
    console.log("\n--- Initializing SDK ---");
    const sdk = new FluidSDK({
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
    });

    const chainId = await sdk.chainId();
    console.log("✅ Connected to chain:", chainId);

    // Test 1: Get all unique MCP tools
    console.log("\n" + "=".repeat(70));
    console.log("TEST 1: Get All Unique MCP Tools");
    console.log("=".repeat(70));
    
    try {
      const allTools = await sdk.getAllMcpTools();
      console.log(`✅ Found ${allTools.length} unique MCP tool(s):`);
      allTools.forEach((tool, idx) => {
        console.log(`   ${idx + 1}. ${tool}`);
      });
    } catch (error) {
      console.log("⚠️  Error:", error instanceof Error ? error.message : String(error));
    }

    // Test 2: Get all unique MCP prompts
    console.log("\n" + "=".repeat(70));
    console.log("TEST 2: Get All Unique MCP Prompts");
    console.log("=".repeat(70));
    
    try {
      const allPrompts = await sdk.getAllMcpPrompts();
      console.log(`✅ Found ${allPrompts.length} unique MCP prompt(s):`);
      allPrompts.forEach((prompt, idx) => {
        console.log(`   ${idx + 1}. ${prompt}`);
      });
    } catch (error) {
      console.log("⚠️  Error:", error instanceof Error ? error.message : String(error));
    }

    // Test 3: Get all unique MCP resources
    console.log("\n" + "=".repeat(70));
    console.log("TEST 3: Get All Unique MCP Resources");
    console.log("=".repeat(70));
    
    try {
      const allResources = await sdk.getAllMcpResources();
      console.log(`✅ Found ${allResources.length} unique MCP resource(s):`);
      allResources.forEach((resource, idx) => {
        console.log(`   ${idx + 1}. ${resource}`);
      });
    } catch (error) {
      console.log("⚠️  Error:", error instanceof Error ? error.message : String(error));
    }

    // Test 4: Search agents with any MCP capabilities
    console.log("\n" + "=".repeat(70));
    console.log("TEST 4: Search Agents with Any MCP Capabilities");
    console.log("=".repeat(70));
    
    try {
      const mcpAgents = await sdk.searchAgentsByMcpCapabilities({
        first: 10,
      });
      console.log(`✅ Found ${mcpAgents.length} agent(s) with MCP capabilities:`);
      mcpAgents.forEach((agent, idx) => {
        console.log(`\n   ${idx + 1}. ${agent.name} (ID: ${agent.agentId})`);
        console.log(`      MCP Enabled: ${agent.mcp}`);
        console.log(`      Tools: ${agent.mcpTools.length}`);
        console.log(`      Prompts: ${agent.mcpPrompts.length}`);
        console.log(`      Resources: ${agent.mcpResources.length}`);
        
        if (agent.mcpTools.length > 0) {
          console.log(`      Tool List: ${agent.mcpTools.join(', ')}`);
        }
        if (agent.mcpPrompts.length > 0) {
          console.log(`      Prompt List: ${agent.mcpPrompts.join(', ')}`);
        }
        if (agent.mcpResources.length > 0) {
          console.log(`      Resource List: ${agent.mcpResources.join(', ')}`);
        }
      });
    } catch (error) {
      console.log("⚠️  Error:", error instanceof Error ? error.message : String(error));
    }

    // Test 5: Search agents by specific tool names (if any exist)
    console.log("\n" + "=".repeat(70));
    console.log("TEST 5: Search Agents by Specific MCP Tools");
    console.log("=".repeat(70));
    
    try {
      // First get available tools
      const availableTools = await sdk.getAllMcpTools();
      
      if (availableTools.length > 0) {
        // Search for agents with the first available tool
        const searchTool = availableTools[0];
        console.log(`🔍 Searching for agents with tool: "${searchTool}"`);
        
        const agentsWithTool = await sdk.searchAgentsByMcpCapabilities({
          toolNames: [searchTool],
          first: 10,
        });
        
        console.log(`✅ Found ${agentsWithTool.length} agent(s) with tool "${searchTool}":`);
        agentsWithTool.forEach((agent, idx) => {
          console.log(`   ${idx + 1}. ${agent.name} (ID: ${agent.agentId})`);
          console.log(`      All Tools: ${agent.mcpTools.join(', ')}`);
        });
      } else {
        console.log("ℹ️  No MCP tools found in the system yet");
      }
    } catch (error) {
      console.log("⚠️  Error:", error instanceof Error ? error.message : String(error));
    }

    // Test 6: Search agents by specific prompt names (if any exist)
    console.log("\n" + "=".repeat(70));
    console.log("TEST 6: Search Agents by Specific MCP Prompts");
    console.log("=".repeat(70));
    
    try {
      const availablePrompts = await sdk.getAllMcpPrompts();
      
      if (availablePrompts.length > 0) {
        const searchPrompt = availablePrompts[0];
        console.log(`🔍 Searching for agents with prompt: "${searchPrompt}"`);
        
        const agentsWithPrompt = await sdk.searchAgentsByMcpCapabilities({
          promptNames: [searchPrompt],
          first: 10,
        });
        
        console.log(`✅ Found ${agentsWithPrompt.length} agent(s) with prompt "${searchPrompt}":`);
        agentsWithPrompt.forEach((agent, idx) => {
          console.log(`   ${idx + 1}. ${agent.name} (ID: ${agent.agentId})`);
          console.log(`      All Prompts: ${agent.mcpPrompts.join(', ')}`);
        });
      } else {
        console.log("ℹ️  No MCP prompts found in the system yet");
      }
    } catch (error) {
      console.log("⚠️  Error:", error instanceof Error ? error.message : String(error));
    }

    // Test 7: Search agents by multiple capabilities
    console.log("\n" + "=".repeat(70));
    console.log("TEST 7: Search Agents by Multiple MCP Capabilities");
    console.log("=".repeat(70));
    
    try {
      const availableTools = await sdk.getAllMcpTools();
      const availablePrompts = await sdk.getAllMcpPrompts();
      
      if (availableTools.length > 0 && availablePrompts.length > 0) {
        console.log(`🔍 Searching for agents with tool OR prompt`);
        
        const agents = await sdk.searchAgentsByMcpCapabilities({
          toolNames: [availableTools[0]],
          promptNames: [availablePrompts[0]],
          matchAll: false, // Match ANY of the specified capabilities
          first: 10,
        });
        
        console.log(`✅ Found ${agents.length} agent(s):`);
        agents.forEach((agent, idx) => {
          console.log(`   ${idx + 1}. ${agent.name} (ID: ${agent.agentId})`);
        });
      } else {
        console.log("ℹ️  Not enough MCP capabilities in the system for this test");
      }
    } catch (error) {
      console.log("⚠️  Error:", error instanceof Error ? error.message : String(error));
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ ALL TESTS COMPLETED");
    console.log("=".repeat(70));

  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
};

// Run the test
console.log("⏱️  Starting test in 2 seconds...");
console.log("Press Ctrl+C to cancel\n");

setTimeout(() => {
  main().then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  }).catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
}, 2000);
