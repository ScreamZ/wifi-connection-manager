# Embedded : WiFi connection manager

> [!IMPORTANT]
> This module is ESM only and only available for usage with the Moddable SDK as it uses core dependencies.
> Learn how to setup an Embedded JavaScript project using [xs-dev](https://xs-dev.js.org/).

A robust solution to manage Wi-Fi connections in embedded systems using the Moddable SDK. `WiFiConnectionManager` simplifies the process of maintaining an active connection to a Wi-Fi access point.

## Features

- **Auto-reconnect:** Automatically retries connection if unavailable at startup or dropped during runtime.
- **Connection lifecycle management:** Allows clean disconnection using `close`.
- **Redundant message suppression:** Filters out repetitive `WiFi.disconnect` messages.
- **Convenient readiness check:** Use the `ready` getter to quickly determine if Wi-Fi is connected.
- **Connection timeout handling:** Forces a disconnect and retries if no IP address is assigned within a configurable timeout.
- **Graceful recovery:** Waits a configurable duration after an unforced disconnect for a clean reconnect.
- **Multiple access points:** Attempts connection to access points in order from a provided list.

## Installation

```sh
npm install @embedded-js/wifi-connection-manager
```

```ts
import Net from "net"; // From moddable SDK
import { WiFiConnectionManager } from "@embedded-js/wifi-connection-manager";

const manager = new WiFiConnectionManager(
  [
    // First access point to attempt
    {
      ssid: "Freebox-ScreamZ",
      password: "invalid!", // Invalid password for testing in a simulator
    },
    // Second access point to attempt
    {
      ssid: "Freebox-ScreamZ",
      password: "good_password",
    },
  ],
  (message) => {
    switch (msg) {
      case WiFiConnectionManager.gotIP.connected:
        break; // still waiting for IP address
      case WiFiConnectionManager.gotIP.gotIP:
        trace(`IP address ${Net.get("IP")}\n`);
        break;
      case WiFiConnectionManager.gotIP.disconnected:
        break; // connection lost
    }
  }
);

// Example: Checking if connected (procedural way)
if (manager.ready) {
  console.log("Wi-Fi is connected!");
}

// Close connection when needed
manager.close();
```
