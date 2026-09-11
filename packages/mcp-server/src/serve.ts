import { createServer } from "node:http";

import { createAskChingHttpHandler, describeAskChingServer } from "./http.js";
import { toWebRequest, writeWebResponse } from "./node-adapter.js";

const port = Number(process.env.PORT ?? 8787);
const endpoint = "/api/mcp";
const handler = createAskChingHttpHandler();

const server = createServer((req, res) => {
  const base = `http://${req.headers.host ?? `localhost:${port}`}`;
  const path = new URL(req.url ?? "/", base).pathname;

  void (async () => {
    try {
      if (path === "/health") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(describeAskChingServer(process.env, endpoint)));
        return;
      }
      if (path !== endpoint) {
        res.statusCode = 404;
        res.end("Not found. MCP endpoint is " + endpoint);
        return;
      }
      await writeWebResponse(await handler(toWebRequest(req, base)), res);
    } catch (error) {
      res.statusCode = 500;
      res.end((error as Error).message);
    }
  })();
});

server.listen(port, () => {
  const info = describeAskChingServer(process.env, endpoint);
  console.error(
    `askching-mcp http listening on http://localhost:${port}${endpoint} (live=${info.live})`
  );
});
