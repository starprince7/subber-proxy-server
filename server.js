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

// Enhanced logging middleware for request payloads
app.use((req, res, next) => {
  console.log(`\n=== INCOMING REQUEST ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
  
  // Log request body/payload if present
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`Request Payload:`, JSON.stringify(req.body, null, 2));
  } else if (req.method !== 'GET' && req.method !== 'HEAD') {
    console.log(`Request Payload: (empty or not JSON)`);
  }
  
  console.log(`========================\n`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Proxy configuration with enhanced logging
const proxyOptions = {
  target: TARGET_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/proxy-server1": "/api", // Remove /proxy-server1 prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`\n🔄 PROXY REQUEST FORWARDING`);
    console.log(`Original URL: ${req.url}`);
    console.log(`Target URL: ${TARGET_URL}${proxyReq.path}`);
    console.log(`Method: ${req.method}`);
    console.log(`Headers being forwarded:`, JSON.stringify(proxyReq.getHeaders(), null, 2));
    
    // Log the request body being forwarded (for POST/PUT/PATCH requests)
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`Forwarding Payload:`, JSON.stringify(req.body, null, 2));
      
      // Ensure the body is properly sent to the target server
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
    
    console.log(`================================\n`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`\n📥 PROXY RESPONSE RECEIVED`);
    console.log(`Status: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    console.log(`Response Headers:`, JSON.stringify(proxyRes.headers, null, 2));
    
    // Add custom headers to the response if needed
    proxyRes.headers["x-proxied-by"] = "subber-proxy";
    
    // Capture and log response body
    let body = '';
    const originalWrite = res.write;
    const originalEnd = res.end;
    
    // Override res.write to capture response data
    res.write = function(chunk) {
      if (chunk) {
        body += chunk;
      }
      return originalWrite.apply(res, arguments);
    };
    
    // Override res.end to log the complete response
    res.end = function(chunk) {
      if (chunk) {
        body += chunk;
      }
      
      // Log the response body
      if (body) {
        try {
          const parsedBody = JSON.parse(body);
          console.log(`Response Data:`, JSON.stringify(parsedBody, null, 2));
        } catch (e) {
          console.log(`Response Data (raw):`, body.substring(0, 500) + (body.length > 500 ? '...' : ''));
        }
      } else {
        console.log(`Response Data: (empty)`);
      }
      
      console.log(`=================================\n`);
      return originalEnd.apply(res, arguments);
    };
  },
  onError: (err, req, res) => {
    console.error(`\n❌ PROXY ERROR`);
    console.error(`Request: ${req.method} ${req.url}`);
    console.error(`Error:`, err.message);
    console.error(`Stack:`, err.stack);
    console.error(`===================\n`);
    
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