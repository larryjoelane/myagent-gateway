// Serves Swagger UI locally against swagger/openapi.yaml so you can authenticate
// (Entra CIAM) and call the deployed gateway's endpoints directly from the browser.
//
// Entra's token endpoint blocks browser-based client-credentials over CORS, so this
// server performs the token exchange itself (server-side) at /token and Swagger UI
// applies the resulting bearer token automatically.
//
// Usage:
//   1. Copy .dev.vars.example to .dev.vars and set CLIENT_SECRET.
//   2. node swagger/serve.mjs   (then open http://127.0.0.1:5173)

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import swaggerUiAssetPath from "swagger-ui-dist/absolute-path.js";

const PORT = 5173;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "..");
const SWAGGER_UI_DIR = swaggerUiAssetPath();

const TENANT_ID = "49850daf-e786-4aaa-baca-a064c11adb2f";
const CLIENT_ID = "ef6896d0-a631-4fa7-8e39-f6e975f0d981";
const SCOPE = `api://${CLIENT_ID}/.default`;
const TOKEN_URL = `https://${TENANT_ID}.ciamlogin.com/${TENANT_ID}/oauth2/v2.0/token`;

const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <title>ai-gateway - local API test console</title>
    <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
    <style>
      #token-bar { padding: 12px 20px; background: #1b1b2f; color: #fff; font-family: sans-serif; }
      #token-bar button { padding: 6px 14px; cursor: pointer; }
      #token-status { margin-left: 12px; font-size: 14px; }
    </style>
  </head>
  <body>
    <div id="token-bar">
      <button id="get-token">Get token &amp; authorize</button>
      <span id="token-status">Not authenticated</span>
    </div>
    <div id="swagger-ui"></div>
    <script src="/swagger-ui/swagger-ui-bundle.js"></script>
    <script src="/swagger-ui/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
      });

      const status = document.getElementById("token-status");
      document.getElementById("get-token").addEventListener("click", async () => {
        status.textContent = "Fetching token...";
        try {
          const res = await fetch("/token");
          const data = await res.json();
          if (!res.ok) throw new Error(data.error_description || data.error || "token request failed");
          window.ui.preauthorizeApiKey("entraCiam", data.access_token);
          const mins = Math.round((data.expires_in || 0) / 60);
          status.textContent = "Authorized (token valid ~" + mins + " min). Try any endpoint below.";
        } catch (err) {
          status.textContent = "Failed: " + err.message;
        }
      });
    </script>
  </body>
</html>`;

async function loadClientSecret() {
  try {
    const contents = await readFile(path.join(ROOT, ".dev.vars"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = /^CLIENT_SECRET=(.*)$/.exec(line.trim());
      if (match) return match[1].trim();
    }
  } catch {
    // .dev.vars missing — fall through to env var.
  }
  return process.env.CLIENT_SECRET ?? null;
}

async function fetchToken() {
  const clientSecret = await loadClientSecret();
  if (!clientSecret) {
    return { status: 500, body: { error: "CLIENT_SECRET not set in .dev.vars or environment" } };
  }

  const upstream = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: clientSecret,
      scope: SCOPE,
    }),
  });

  const body = await upstream.json();
  return { status: upstream.status, body };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(INDEX_HTML);
      return;
    }

    if (url.pathname === "/token") {
      const { status, body } = await fetchToken();
      res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(body));
      return;
    }

    if (url.pathname === "/openapi.json") {
      const yamlText = await readFile(path.join(DIR, "openapi.yaml"), "utf8");
      const spec = parseYaml(yamlText);
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(spec));
      return;
    }

    if (url.pathname.startsWith("/swagger-ui/")) {
      const assetName = url.pathname.replace("/swagger-ui/", "");
      const assetPath = path.join(SWAGGER_UI_DIR, assetName);
      const body = await readFile(assetPath);
      res.writeHead(200, { "content-type": contentTypeFor(assetName) });
      res.end(body);
      return;
    }

    res.writeHead(404);
    res.end("not found");
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(error instanceof Error ? error.message : String(error));
  }
});

function contentTypeFor(assetName) {
  if (assetName.endsWith(".css")) return "text/css; charset=utf-8";
  if (assetName.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (assetName.endsWith(".map")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

server.listen(PORT, () => {
  console.log(`Swagger UI running at http://127.0.0.1:${PORT}`);
});
