/// <reference types="../node_modules/@moddable/typings/xs.d.ts" />
/// <reference types="../node_modules/@moddable/typings/wifi.d.ts" />
/// <reference types="../node_modules/@moddable/typings/timer.d.ts" />

import Timer from "timer";
import WiFi, { type WiFiCallback, type WiFiOptions } from "wifi";

type WiFiMessage =
	| "gotIP"
	| "lostIP"
	| "connect"
	| "disconnect"
	| "station_connect"
	| "station_disconnect";

/**
 * WiFiConnectionManager is designed to be used in place of the "wifi" module in projects that need a continuously available connection to a Wi-Fi access point.
 *
 * - If no connection available at start, retries until one is.
 * - Automatically attempts to reconnect when connection dropped.
 * - Disconnects when calling close.
 * - Suppresses redundant WiFi.disconnect messages.
 * - Callback uses same message constants as "wifi" from the Moddable SDK.
 * - Getter on "ready" is convenient way to check if Wi-Fi is connected.
 * - If connection attempt does not succeed with an IP address in X (arg) seconds, forces disconnect and retries.
 * - Wait X (configurable) seconds after (unforced) disconnect to ensure clean reconnect.
 * - Try a list of access point in order from array structure
 *
 * ```ts
 * import { WiFiConnectionManager } from "@embedded-js/wifi-connection-manager";
 *
 * const manager = new WiFiConnectionManager(
 *   [
 *     // First access point tested
 *     {
 *       ssid: "Freebox-ScreamZ",
 *       password: "invalid!", // For usage in simulator, this is the checked invalid password
 *     },
 *     // Second access point tested
 *     {
 *       ssid: "Freebox-ScreamZ",
 *       password: "good_password",
 *     },
 *   ],
 *   (m) => {
 *     trace(m, "\n");
 *   }
 * );
 * ```
 *
 * This code is based on the Wi-Fi Connection example in the Moddable SDK:
 *     https://github.com/Moddable-OpenSource/moddable/blob/public/examples/network/wifi/wificonnection/wificonnection.js
 */
export class WiFiConnectionManager extends WiFi {
	private reconnectTimer?: Timer;
	private connectionTimer?: Timer;
	private currentState: WiFiMessage = "disconnect";
	private APIndex = 0;

	constructor(
		private readonly accessPointConfig: Array<WiFiOptions>,
		private onNetworkChange?: WiFiCallback,
		private readonly reconnectInterval: number = 5000, // Default reconnect interval in ms
		private readonly connectionTimeout: number = 30000, // Default connection timeout in ms
	) {
		// Initialize parent WiFi class with a custom callback handler
		super(accessPointConfig[0], (message) => this.handleWiFiEvent(message));

		// Start the initial connection attempt with a timeout
		this.startConnectionTimer();
	}

	/**
	 * Handles WiFi events and manages state transitions, reconnection, and user callbacks.
	 */
	private handleWiFiEvent(message: WiFiMessage): void {
		if (message === "disconnect") {
			this.handleDisconnect();
		} else if (message === "gotIP") {
			this.clearTimers();
			this.APIndex = 0; // Reset access point index on successful connection
		} else if (message === "connect") {
			this.clearReconnectTimer();
		}

		this.currentState = message;
		this.onNetworkChange?.(message);
	}

	/**
	 * Handles WiFi disconnection events, including retries and reconnection.
	 */
	private handleDisconnect(): void {
		this.clearConnectionTimer();

		this.APIndex = (this.APIndex + 1) % this.accessPointConfig.length;

		this.clearReconnectTimer();
		this.reconnectTimer = Timer.set(() => {
			this.reconnectTimer = undefined;

			try {
				WiFi.connect(this.accessPointConfig[this.APIndex]);
				this.startConnectionTimer();
			} catch (error) {
				trace("Error during reconnect:", error as string);
				this.handleDisconnect();
			}
		}, this.reconnectInterval); // Wait before reconnecting, accounting for spurious disconnects

		if (this.currentState !== "disconnect") {
			this.currentState = "disconnect";
			this.onNetworkChange?.("disconnect");
		}
	}

	/**
	 * Starts a timer for connection attempts, forcing a disconnect on timeout.
	 */
	private startConnectionTimer(): void {
		this.connectionTimer = Timer.set(() => {
			this.clearConnectionTimer();
			try {
				WiFi.disconnect(); // Force disconnect on timeout
			} catch (error) {
				trace("Error during forced disconnect:", error as string);
			}
		}, this.connectionTimeout);
	}

	/**
	 * Clears the connection attempt timer.
	 */
	private clearConnectionTimer(): void {
		if (this.connectionTimer) {
			Timer.clear(this.connectionTimer);
			this.connectionTimer = undefined;
		}
	}

	/**
	 * Clears the reconnect timer.
	 */
	private clearReconnectTimer(): void {
		if (this.reconnectTimer) {
			Timer.clear(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}
	}

	/**
	 * Clears all timers and resets connection state.
	 */
	private clearTimers(): void {
		this.clearConnectionTimer();
		this.clearReconnectTimer();
	}

	/**
	 * Closes the connection, cleans up resources, and resets the state.
	 * This method should be called when the manager is no longer needed
	 * to ensure proper cleanup of timers and resources.
	 */
	override close(): void {
		this.clearTimers();
		try {
			WiFi.disconnect();
		} catch (error) {
			trace("Error during WiFi.disconnect:", error as string);
		}

		try {
			super.close();
		} catch (error) {
			trace("Error during super.close:", error as string);
		}
	}

	/**
	 * Returns true if the connection has obtained an IP address.
	 */
	get ready(): boolean {
		return this.currentState === "gotIP";
	}
}
