# FluidSDK Testing Guide

## Available Test Scripts

### 1. `indextest.ts` - Basic SDK Test
```bash
npm test
```
Basic functionality test of the SDK with read operations.

### 2. `quicktest.ts` - Quick Integration Test
```bash
npm run test:quick
```
Fast test of core SDK features without blockchain transactions.

### 3. `fullflow.ts` - Complete Agent Lifecycle
```bash
npm run test:fullflow
```
Full test of agent creation, registration, feedback, and search.

### 4. `fullflow-mcp-subgraph.ts` - MCP + Subgraph Integration ⭐ **RECOMMENDED**
```bash
npm run test:fullflow-mcp
```

**Complete integration test with:**
- ✅ MCP server connectivity (https://fluidmcpserver.vercel.app/)
- ✅ Agent creation with MCP endpoint
- ✅ On-chain registration with IPFS
- ✅ Real-time subgraph verification
- ✅ Agent search and discovery
- ✅ Complete lifecycle validation

**Results:** See `../MCP_SUBGRAPH_TEST_RESULTS.md`

### 5. `test-mcp.ts` - MCP Specific Test
```bash
npm run test:mcp
```
Focused test for MCP integration features.

### 6. `mcp-server.ts` - Local MCP Server
```bash
npm run mcp:server
```
Run a local MCP server for testing.

---

## Setup

1. Copy the environment example file:
```bash
cp .env.example .env
```

2. Edit `.env` and configure:
   - `RPC_URL`: Your blockchain RPC endpoint (defaults to Sepolia testnet)
   - `CHAIN_ID`: Chain ID (11155111 for Sepolia, 1 for Ethereum mainnet)
   - `PRIVATE_KEY`: Your wallet private key (optional, leave empty for read-only mode)
   - `TEST_AGENT_ID`: An existing agent ID to test (format: `chainId:tokenId`)

## Running Tests

### Quick Test (Read-only)
```bash
npm test
```

This will run the test suite in read-only mode using the default Sepolia testnet.

### With Custom Configuration
```bash
# Set environment variables
$env:RPC_URL="https://your-rpc-url"
$env:CHAIN_ID="11155111"
$env:PRIVATE_KEY="your-private-key"
$env:TEST_AGENT_ID="11155111:1"

# Run test
npm test
```

### Direct Execution
```bash
node --loader ts-node/esm --env-file=.env scripts/indextest.ts
```

## Test Coverage

The test suite covers:

### Read Operations (No signer required)
- ✅ SDK initialization
- ✅ Chain ID retrieval
- ✅ Registry address lookup
- ✅ Create agent (off-chain)
- ✅ Search agents
- ✅ Get agent by ID
- ✅ Load agent (full registration)
- ✅ Search agents by reputation
- ✅ Search feedback
- ✅ Get reputation summary

### Write Operations (Requires signer)
- ✅ Prepare feedback
- ⚠️ Give feedback (commented out to avoid gas costs)
- ⚠️ Transfer agent (commented out to avoid gas costs)
- ⚠️ Revoke feedback (commented out to avoid gas costs)

## Security Notes

⚠️ **NEVER commit your `.env` file or private keys to git!**

The `.env` file is in `.gitignore` to prevent accidental commits.

## Example Output

```
=== FluidSDK Test Suite ===

--- Initializing SDK ---
✅ Signer created: 0x1234...5678
✅ SDK initialized
Chain ID: 11155111
Read-only mode: false
Registry addresses: { IDENTITY: '0x...', REPUTATION: '0x...', VALIDATION: '0x...' }

--- Test 1: Create Agent (off-chain) ---
✅ Agent created: [Agent object]

--- Test 2: Search Agents ---
✅ Found 5 agents
First agent: { id: '11155111:1', name: 'Test Agent', ... }

...

=== Test Suite Completed ===
```
