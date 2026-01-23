# @outray/vite

Vite plugin to automatically expose your local dev server to the internet via [Outray](https://outray.dev) tunnel.

## Installation

```bash
npm install @outray/vite
# or
pnpm add @outray/vite
# or
yarn add @outray/vite
```

## Usage

### Basic Usage

Add the plugin to your `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import outray from '@outray/vite'

export default defineConfig({
  plugins: [outray()]
})
```

When you start your dev server, you'll see the tunnel URL in the console:

```
  VITE v6.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  Tunnel:  https://abc123.outray.dev/
```

### With Options

```ts
import { defineConfig } from 'vite'
import outray from '@outray/vite'

export default defineConfig({
  plugins: [
    outray({
      // Use a specific subdomain (requires authentication)
      subdomain: 'my-app',

      // API key for authentication
      apiKey: process.env.OUTRAY_API_KEY,

      // Use a custom domain (must be configured in dashboard first)
      customDomain: 'dev.mycompany.com',

      // Disable tunnel in certain environments
      enabled: process.env.NODE_ENV !== 'test',

      // Suppress tunnel logs
      silent: false,

      // Callback when tunnel is ready
      onTunnelReady: (url) => {
        console.log(`Share this URL: ${url}`)
      },

      // Callback on tunnel error
      onError: (error) => {
        console.error('Tunnel error:', error)
      }
    })
  ]
})
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `subdomain` | `string` | - | Subdomain for the tunnel URL (requires auth) |
| `customDomain` | `string` | - | Custom domain (must be configured in dashboard) |
| `apiKey` | `string` | `process.env.OUTRAY_API_KEY` | API key for authentication |
| `serverUrl` | `string` | `'wss://api.outray.dev/'` | Outray server WebSocket URL |
| `enabled` | `boolean` | `true` | Enable or disable the tunnel |
| `silent` | `boolean` | `false` | Suppress tunnel status logs |
| `onTunnelReady` | `(url: string) => void` | - | Callback when tunnel is established |
| `onError` | `(error: Error) => void` | - | Callback when tunnel encounters an error |

## Environment Variables

The plugin also reads these environment variables:

| Variable | Description |
|----------|-------------|
| `OUTRAY_API_KEY` | API key for authentication |
| `OUTRAY_SUBDOMAIN` | Default subdomain to use |
| `OUTRAY_SERVER_URL` | Custom server URL (for self-hosted) |
| `OUTRAY_ENABLED` | Set to `false` to disable tunnel |

## Features

- **Zero-config** - Works out of the box with sensible defaults
- **Auto-reconnect** - Automatically reconnects if connection drops
- **Graceful cleanup** - Tunnel closes when dev server stops
- **Vite-styled output** - Tunnel URL displays alongside Vite's local URLs
- **Environment variables** - Configure via env vars for different environments