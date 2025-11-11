import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Simple MCP Server for FluidSDK Testing
 * This server provides tools, prompts, and resources that can be discovered by agents
 */

// Create MCP server instance
const server = new Server(
  {
    name: "fluidsdk-test-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  }
);

// ============================================
// TOOLS - Executable functions
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "calculate",
        description: "Perform basic mathematical calculations",
        inputSchema: {
          type: "object",
          properties: {
            operation: {
              type: "string",
              enum: ["add", "subtract", "multiply", "divide"],
              description: "The mathematical operation to perform",
            },
            a: {
              type: "number",
              description: "First number",
            },
            b: {
              type: "number",
              description: "Second number",
            },
          },
          required: ["operation", "a", "b"],
        },
      },
      {
        name: "get_weather",
        description: "Get mock weather information for a location",
        inputSchema: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name or coordinates",
            },
          },
          required: ["location"],
        },
      },
      {
        name: "echo",
        description: "Echo back the input message",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Message to echo back",
            },
          },
          required: ["message"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "calculate": {
      const { operation, a, b } = args as { operation: string; a: number; b: number };
      let result: number;
      
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Division by zero",
                },
              ],
            };
          }
          result = a / b;
          break;
        default:
          return {
            content: [
              {
                type: "text",
                text: `Error: Unknown operation ${operation}`,
              },
            ],
          };
      }

      return {
        content: [
          {
            type: "text",
            text: `Result: ${a} ${operation} ${b} = ${result}`,
          },
        ],
      };
    }

    case "get_weather": {
      const { location } = args as { location: string };
      const mockWeather = {
        location,
        temperature: Math.floor(Math.random() * 30) + 10,
        condition: ["Sunny", "Cloudy", "Rainy", "Windy"][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 60) + 40,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mockWeather, null, 2),
          },
        ],
      };
    }

    case "echo": {
      const { message } = args as { message: string };
      return {
        content: [
          {
            type: "text",
            text: `Echo: ${message}`,
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Error: Unknown tool ${name}`,
          },
        ],
      };
  }
});

// ============================================
// PROMPTS - Reusable prompt templates
// ============================================

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "greeting",
        description: "Generate a friendly greeting",
        arguments: [
          {
            name: "name",
            description: "Name to greet",
            required: true,
          },
        ],
      },
      {
        name: "code_review",
        description: "Template for code review requests",
        arguments: [
          {
            name: "language",
            description: "Programming language",
            required: true,
          },
          {
            name: "complexity",
            description: "Code complexity level",
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "greeting": {
      const userName = args?.name || "User";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Hello ${userName}! Welcome to the FluidSDK MCP Test Server. How can I assist you today?`,
            },
          },
        ],
      };
    }

    case "code_review": {
      const language = args?.language || "JavaScript";
      const complexity = args?.complexity || "medium";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please review the following ${language} code with ${complexity} complexity. Focus on:
1. Code quality and best practices
2. Potential bugs or security issues
3. Performance optimizations
4. Readability and maintainability`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// ============================================
// RESOURCES - Static or dynamic data
// ============================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "fluidsdk://config",
        name: "SDK Configuration",
        description: "Current SDK configuration information",
        mimeType: "application/json",
      },
      {
        uri: "fluidsdk://status",
        name: "Server Status",
        description: "MCP server status and metadata",
        mimeType: "application/json",
      },
      {
        uri: "fluidsdk://docs/quickstart",
        name: "Quick Start Guide",
        description: "Getting started with FluidSDK",
        mimeType: "text/markdown",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case "fluidsdk://config":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                serverName: "fluidsdk-test-mcp",
                version: "1.0.0",
                capabilities: ["tools", "prompts", "resources"],
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };

    case "fluidsdk://status":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                status: "running",
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };

    case "fluidsdk://docs/quickstart":
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: `# FluidSDK Quick Start

## Installation
\`\`\`bash
npm install fluidsdk
\`\`\`

## Initialize SDK
\`\`\`typescript
import { FluidSDK } from "fluidsdk";

const sdk = new FluidSDK({
  chainId: 11155111,
  rpcUrl: "https://rpc.url",
  signer: wallet,
});
\`\`\`

## Create an Agent
\`\`\`typescript
const agent = sdk.createAgent("My Agent", "Description", "ipfs://...");
await agent.registerIPFS();
\`\`\`
`,
          },
        ],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// ============================================
// Start Server
// ============================================

async function main() {
  console.error("🚀 FluidSDK MCP Test Server starting...");
  console.error("📋 Capabilities:");
  console.error("   - Tools: calculate, get_weather, echo");
  console.error("   - Prompts: greeting, code_review");
  console.error("   - Resources: config, status, docs");
  console.error("\n✅ Server ready for connections\n");

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
