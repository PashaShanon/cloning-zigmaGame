/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to host your server on Colyseus Cloud
 *
 * If you're self-hosting (without Colyseus Cloud), you can manually
 * instantiate a Colyseus Server as documented here:
 *
 * See: https://docs.colyseus.io/server/api/#constructor-options
 */
import { listen } from "@colyseus/tools";
import { Encoder } from "@colyseus/schema";

// Increase default buffer size for large encoded states
Encoder.BUFFER_SIZE = 64 * 1024; // 64 KB

// Import Colyseus config
import app from "./app.config.js";

// Create and listen on 2567 (or PORT environment variable.)
listen(app);
