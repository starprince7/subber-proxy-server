const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");
const dotenv = require("dotenv");
const https = require("https");

// Load environment variables
dotenv.config();

// Create Express server
const app = express();

// Define constants
const PORT = process.env.PORT || 3001;
const TARGET_URL = process.env.TARGET_URL || "http://localhost:8080";

// Middleware
app.use(helmet()); // Security headers
app.use(morgan("combined")); // Logging
app.use(cors()); // CORS support
app.use(express.json()); // Parse JSON bodies

// Testing middleware
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} - Req Path: ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Proxy configuration
const proxyOptions = {
  target: TARGET_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/proxy-server1": "", // Remove /proxy-server1 prefix when forwarding
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add custom headers to the response if needed
    proxyRes.headers["x-proxied-by"] = "subber-proxy";
  },
  onError: (err, req, res) => {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error", message: err.message });
  },
  logLevel: process.env.NODE_ENV === "development" ? "debug" : "error",
};

// Simple route for testing
app.get("/", (req, res) => {
  res.status(200).json({ message: "Proxy server is running" });
});

// Route see server's outbound request IP
app.get("/my-ip", (req, res) => {
  https.get("https://api.ipify.org?format=json", (resp) => {
    let data = "";
    resp.on("data", (chunk) => (data += chunk));
    resp.on("end", () => res.send(data));
  });
});

// Apply proxy middleware to all routes
app.use(createProxyMiddleware(proxyOptions));

// Fallback route - use a specific path pattern instead of '*' to avoid compatibility issues
app.get("/:path(*)", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Server error", message: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Proxying requests to: ${TARGET_URL}`);
});

module.exports = app; // Export for testing
