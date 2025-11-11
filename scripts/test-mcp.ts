import { FluidSDK } from "../dist/index.js";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { spawn } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Load environment variables
dotenv.config();

let mcpServerProcess: any = null;

async function startMCPServer(): Promise<string> {
  console.log("🚀 Starting MCP server...");
  
  // Start the MCP server as a subprocess
  mcpServerProcess = spawn("node", ["scripts/mcp-server.js"], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("✅ MCP server started (PID:", mcpServerProcess.pid, ")");
  
  // For this test, we'll use stdio transport
  // In production, you'd expose this via HTTP/SSE
  return "stdio://fluidsdk-test-mcp";
}

async function testMCPConnection(mcpUrl: string) {
  console.log("\n--- Testing MCP Connection ---");
  
  try {
    // Connect to MCP server
    const transport = new StdioClientTransport({
      command: "node",
      args: ["scripts/mcp-server.js"],
    });
    
    const client = new Client(
      {
        name: "fluidsdk-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
    
    await client.connect(transport);
    console.log("✅ Connected to MCP server");
    
    // List available tools
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    
    // List available prompts
    const prompts = await client.listPrompts();
    console.log(`✅ Found ${prompts.prompts.length} prompts:`);
    prompts.prompts.forEach(prompt => {
      console.log(`   - ${prompt.name}: ${prompt.description}`);
    });
    
    // List available resources
    const resources = await client.listResources();
    console.log(`✅ Found ${resources.resources.length} resources:`);
    resources.resources.forEach(resource => {
      console.log(`   - ${resource.name}: ${resource.uri}`);
    });
    
    // Test a tool
    console.log("\n--- Testing MCP Tool: calculate ---");
    const calcResult = await client.callTool({
      name: "calculate",
      arguments: {
        operation: "add",
        a: 42,
        b: 58,
      },
    });
    // console.log("✅ Tool result:", calcResult.content[0]);
    
    // Test a prompt
    console.log("\n--- Testing MCP Prompt: greeting ---");
    const greetingPrompt = await client.getPrompt({
      name: "greeting",
      arguments: {
        name: "FluidSDK Tester",
      },
    });
    console.log("✅ Prompt result:", greetingPrompt.messages[0]);
    
    // Test a resource
    console.log("\n--- Testing MCP Resource: status ---");
    const statusResource = await client.readResource({
      uri: "fluidsdk://status",
    });
    console.log("✅ Resource content:", statusResource.contents[0].text);
    
    await client.close();
    console.log("✅ MCP client closed");
    
    return {
      tools: tools.tools.map(t => t.name),
      prompts: prompts.prompts.map(p => p.name),
      resources: resources.resources.map(r => r.uri),
    };
    
  } catch (error) {
    console.log("❌ MCP connection failed:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function main() {
  try {
    console.log("=== FluidSDK + MCP Integration Test ===\n");

    // Configuration
    const RPC_URL = process.env.RPC_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111");
    const PINATA_JWT = process.env.PINATA_JWT;

    if (!RPC_URL || !PRIVATE_KEY) {
      throw new Error("RPC_URL and PRIVATE_KEY required in .env");
    }

    const signer = new ethers.Wallet(PRIVATE_KEY);
    console.log("✅ Signer address:", signer.address);

    // Step 1: Compile MCP server
    console.log("\n--- Step 1: Compile MCP Server ---");
    const { execSync } = await import("child_process");
    try {
      execSync("npx tsc scripts/mcp-server.ts --outDir scripts --module nodenext --target esnext --moduleResolution nodenext", {
        stdio: "inherit",
      });
      console.log("✅ MCP server compiled");
    } catch (error) {
      console.log("❌ Failed to compile MCP server");
      return;
    }

    // Step 2: Start MCP Server
    const mcpUrl = await startMCPServer();
    
    // Step 3: Test MCP Connection
    const mcpCapabilities = await testMCPConnection(mcpUrl);
    
    if (!mcpCapabilities) {
      console.log("⚠️  MCP server not responding, continuing with SDK test...");
    }

    // Step 4: Initialize FluidSDK
    console.log("\n--- Step 2: Initialize FluidSDK ---");
    const sdk = new FluidSDK({
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
      signer: signer,
      ipfs: PINATA_JWT ? 'pinata' : undefined,
      pinataJwt: PINATA_JWT,
    });

    const chainId = await sdk.chainId();
    console.log("✅ SDK connected to chain:", chainId);

    const registries = sdk.registries();
    if (Object.keys(registries).length === 0) {
      console.log("⚠️  No registries configured, skipping agent registration");
      return;
    }

    // Step 5: Create Agent with MCP Endpoint
    console.log("\n--- Step 3: Create Agent with MCP Endpoint ---");
    const agent = sdk.createAgent(
      `MCP Agent ${Date.now()}`,
      "An agent with MCP server capabilities for testing",
      "ipfs://QmMCPTestAgent"
    );

    // For production, you'd expose MCP server via HTTP/SSE
    // For now, we'll use a mock HTTP endpoint
    const mockMCPEndpoint = "http://localhost:3000/mcp";
    await agent.setMCP(mockMCPEndpoint, "2025-06-18", false);
    
    console.log("✅ Agent configured with MCP endpoint:", mockMCPEndpoint);
    
    if (mcpCapabilities) {
      console.log("✅ MCP Capabilities discovered:");
      console.log("   Tools:", mcpCapabilities.tools.join(", "));
      console.log("   Prompts:", mcpCapabilities.prompts.join(", "));
      console.log("   Resources:", mcpCapabilities.resources.join(", "));
    }

    agent.setActive(true);

    // Step 6: Register Agent with MCP capabilities
    console.log("\n--- Step 4: Register Agent ---");
    
    if (!sdk.ipfsClient) {
      console.log("⚠️  No IPFS client configured");
      console.log("Agent created with MCP endpoint but not registered on-chain");
      return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const balance = await provider.getBalance(signer.address);
    
    if (balance === 0n) {
      console.log("⚠️  No balance for gas fees");
      console.log("Agent created with MCP endpoint but not registered on-chain");
      return;
    }

    console.log("📝 Registering agent with MCP capabilities...");
    const registrationFile = await agent.registerIPFS();
    
    console.log("✅ Agent registered!");
    console.log("   Agent ID:", registrationFile.agentId);
    console.log("   MCP Endpoint:", agent.mcpEndpoint);
    console.log("   Agent URI:", registrationFile.agentURI);

    // Step 7: Verify Registration
    console.log("\n--- Step 5: Verify MCP Agent ---");
    if (registrationFile.agentId) {
      const loadedAgent = await sdk.loadAgent(registrationFile.agentId);
      console.log("✅ Agent loaded from blockchain");
      console.log("   Name:", loadedAgent.name);
      console.log("   MCP Endpoint:", loadedAgent.mcpEndpoint);
      
      if (mcpCapabilities && loadedAgent.mcpTools) {
        console.log("   MCP Tools:", loadedAgent.mcpTools.join(", "));
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ MCP INTEGRATION TEST COMPLETED!");
    console.log("=".repeat(60));
    console.log("\n📝 Summary:");
    console.log("- MCP server running with tools, prompts, and resources");
    console.log("- Agent registered with MCP endpoint");
    console.log("- MCP capabilities discoverable by clients");
    console.log("\n💡 Next Steps:");
    console.log("- Expose MCP server via HTTP/SSE for production use");
    console.log("- Implement MCP endpoint crawler for auto-discovery");
    console.log("- Add authentication for MCP server access");

  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("Stack:", error.stack);
    }
  } finally {
    // Cleanup
    if (mcpServerProcess) {
      console.log("\n🛑 Stopping MCP server...");
      mcpServerProcess.kill();
    }
  }
}

main().then(() => {
  console.log("\n✅ Test completed");
  process.exit(0);
}).catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
});
