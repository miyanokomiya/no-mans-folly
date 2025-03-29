# MCP server for No-man's folly

The server depends on `chromium` to operate the application.

```sh
npx playwright install chromium
```

## Develop

### Build

```sh
yarn build
```

### Debug

Build MCP server and start the inspector.

```sh
yarn build && CLIENT_PORT=5174 npx @modelcontextprotocol/inspector node dist/server.js
```
