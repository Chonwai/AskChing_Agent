#!/usr/bin/env node

import { createMarketDataSource } from "@askching/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerAskChingTools } from "./register.js";

const dataSource = createMarketDataSource(process.env);
const server = new McpServer({ name: "askching", version: "0.1.0" });

registerAskChingTools(server, dataSource);

await server.connect(new StdioServerTransport());
