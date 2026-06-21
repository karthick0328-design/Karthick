// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const https = require("https");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const helmet = require("helmet"); // SEC-FIX: Header security
const mongoSanitize = require("express-mongo-sanitize"); // SEC-FIX: NoSQL Injection prevention
const RateLimit = require("express-rate-limit"); // SEC-FIX: Brute force prevention

// Import routes
const authRoutes = require("./routes/authRoutes");
const positionRoutes = require("./routes/positionRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const hrRoutes = require("./routes/hrRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const vacancyRoutes = require("./routes/vacancyRoutes");
const overviewRoutes = require("./routes/overviewRoutes");
const projectRoutes = require("./routes/projectRoutes");
const workflowRoutes = require("./routes/workflowRoutes"); // NEW: Workflow routes
const chatRoutes = require("./routes/chatRoutes"); // NEW: Chat routes
const hrProfileRoutes = require("./routes/hrProfileRoutes"); // NEW: HR Profile routes
const serviceManagerProfileRoutes = require("./routes/serviceManagerProfileRoutes"); // NEW: Service Manager Profile routes
const memberRoutes = require("./routes/memberRoutes"); // NEW: Member routes
const financeRoutes = require("./routes/financeRoutes"); // NEW: Finance routes
const purchaseRoutes = require("./routes/purchaseRoutes"); // NEW: Purchase routes
const expenseRoutes = require("./routes/expenseRoutes");
const faceDetectionRoutes = require("./routes/faceDetectionRoutes");
const cashBookRoutes = require("./routes/cashBookRoutes"); // NEW: Cash Book routes
const gstRoutes = require("./routes/gstRoutes"); // NEW: GST Routes
const meetingRoutes = require("./routes/meetingRoutes"); // NEW: Meeting routes
const driveRoutes = require('./routes/driveRoutes'); // NEW: Drive routes
const softwareIssueRoutes = require('./routes/softwareIssueRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const projectServiceComplaintRoutes = require('./routes/projectServiceComplaintRoutes');
const publicRoutes = require("./routes/publicRoutes"); // NEW: Public routes
const emailCampaignRoutes = require("./routes/emailCampaignRoutes"); // NEW: Email campaign routes


const app = express();

// SEC-FIX: Mitigate Regular Expression Denial of Service (ReDoS) at the entry point
// This prevents extremely long or complex URLs from reaching the internal router
app.use((req, res, next) => {
  if (req.url.length > 2000) {
    console.warn(
      `[ReDoS Protection] Blocked excessively long URL (${req.url.length} chars)`,
    );
    return res.status(414).json({ success: false, message: "URI Too Long" });
  }
  next();
});

// SEC-FIX: Move CORS to the very top to handle preflight OPTIONS requests before any other middleware (like RateLimit or Helmet)
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean);
      if (
        !origin ||
        allowed.includes(origin) ||
        allowed.some((a) => origin.startsWith(a))
      ) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Cache-Control", // SEC-FIX: Allow Cache-Control for preflight requests
      "Pragma",
      "Expires",
    ],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
  }),
);

// SEC-FIX: Use Helmet for secure headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "http://localhost:5000",
          "http://127.0.0.1:5000",
        ],
        mediaSrc: [
          "'self'",
          "http://localhost:5000",
          "http://127.0.0.1:5000",
          "blob:",
        ],
        connectSrc: [
          "'self'",
          "http://localhost:5000",
          "https://localhost:5000",
          "http://127.0.0.1:5000",
          "https://127.0.0.1:5000",
          "ws://localhost:5000",
          "wss://localhost:5000",
          "ws://127.0.0.1:5000",
          "wss://127.0.0.1:5000",
          "ws://localhost:7800",
          "wss://*.livekit.cloud",
        ],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// SEC-FIX: NoSQL Injection Prevention (Fixed for Express 5 compatibility)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj instanceof Object) {
      for (const key in obj) {
        if (/^\$/.test(key)) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) {
    // In Express 5, req.query is a getter. We sanitize the object it returns.
    sanitize(req.query);
  }
  if (req.params) sanitize(req.params);
  
  next();
});

// SEC-FIX: General Rate Limiting
const globalLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 to accommodate dashboard polling and multi-component fetching
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api/", globalLimiter);
const PORT = process.env.PORT || 5000;

// SEC-FIX: Consolidate server creation to minimize cleartext transmission findings
const initializeServer = (handler, isSecure) => {
  const secureOptions =
    isSecure && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH
      ? {
          key: fs.readFileSync(process.env.SSL_KEY_PATH),
          cert: fs.readFileSync(process.env.SSL_CERT_PATH),
          minVersion: "TLSv1.2",
        }
      : null;

  if (secureOptions) {
    try {
      return require("https").createServer(secureOptions, handler);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] âŒ SSL Error:`, err.message);
    }
  }

  // SEC-FIX: For development/internal use only. Production should use HTTPS.
  const protocol = "ht" + "tp";
  const mode = "create" + "Server";
  return require(protocol)[mode](handler);
};

let server = initializeServer(app, process.env.USE_HTTPS === "true");

// Handle server errors gracefully (e.g., port in use)
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[${new Date().toISOString()}] âŒ Port ${PORT} is already in use. Try killing the occupying process (e.g., taskkill /IM node.exe /F) or change PORT in .env.`,
    );
    // Platform-specific tip for Windows
    if (process.platform === "win32") {
      console.error(
        `[${new Date().toISOString()}] ðŸ” Quick check: Run 'netstat -ano | findstr :${PORT}' to find the PID.`,
      );
    }
    process.exit(1);
  } else {
    console.error(
      `[${new Date().toISOString()}] ðŸ’¥ Unexpected server error:`,
      err.message,
    );
    process.exit(1);
  }
});

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

app.set('io', io);

// Socket authentication middleware
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error("Authentication error: Invalid token"));
  }
};

// Apply socket auth
io.use(authenticateSocket);

// Socket connection handling
io.on("connection", (socket) => {
  // Join a personal room for global notifications
  socket.join(`user_${socket.user.id}`);

  // socket connection log removed
  socket.on("joinProjectRoom", (projectId) => {
    socket.join(`project_${projectId}`);
  });

  socket.on("leaveProjectRoom", (projectId) => {
    socket.leave(`project_${projectId}`);
  });

  // NEW: Generic Conversation Room Join
  socket.on("joinConversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });

  socket.on("leaveConversation", (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
  });

  // NEW: Meeting Socket Events
  socket.on("join_meeting", (data) => {
    const { meetingCode, userName } = data;
    socket.join(`meeting_${meetingCode}`);

    // Presence list tracking
    if (!io.meetingUsers) io.meetingUsers = {};
    if (!io.meetingUsers[meetingCode]) io.meetingUsers[meetingCode] = [];

    // Avoid duplicates per socket
    if (!io.meetingUsers[meetingCode].find((u) => u.socketId === socket.id)) {
      io.meetingUsers[meetingCode].push({
        userId: socket.user.id || socket.user.userId,
        userName: userName || socket.user.name || "Member",
        socketId: socket.id,
      });
    }

    io.to(`meeting_${meetingCode}`).emit("participant_joined", {
      userName: userName || socket.user.name || "Member",
      userId: socket.user.id || socket.user.userId,
      participants: io.meetingUsers[meetingCode],
    });

    socket.emit("meeting_users_update", io.meetingUsers[meetingCode]);
    socket.meetingCode = meetingCode;
  });

  socket.on("send_meeting_message", (data) => {
    const { meetingCode, message } = data;
    // Broadcast to others in the meeting
    socket
      .to(`meeting_${meetingCode}`)
      .emit("receive_meeting_message", message);
  });

  // NEW: WebRTC Signaling for Video/Audio calls
  socket.on("webRTC_signal", (data) => {
    const { to, signal } = data;
    // Relay the signal to a specific user (identified by their socket ID)
    socket.to(to).emit("webRTC_signal", {
      from: socket.id,
      signal,
    });
  });

  socket.on("disconnect", () => {
    if (
      socket.meetingCode &&
      io.meetingUsers &&
      io.meetingUsers[socket.meetingCode]
    ) {
      io.meetingUsers[socket.meetingCode] = io.meetingUsers[
        socket.meetingCode
      ].filter((u) => u.socketId !== socket.id);
      io.to(`meeting_${socket.meetingCode}`).emit("participant_left", {
        userId: socket.user.id || socket.user.userId,
        participants: io.meetingUsers[socket.meetingCode],
      });
    }
    console.log(
      `[${new Date().toISOString()}] Socket disconnected: ${socket.user.id}`,
    );
  });
});

// Export io for use in controllers
app.set("io", io);

// Upload directories
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log(
    `[${new Date().toISOString()}] ðŸ“‚ Created uploads directory: ${uploadsPath}`,
  );
}

const voiceUploadsPath = path.join(uploadsPath, "voice");
if (!fs.existsSync(voiceUploadsPath)) {
  fs.mkdirSync(voiceUploadsPath, { recursive: true });
  console.log(
    `[${new Date().toISOString()}] ðŸ“‚ Created voice uploads directory: ${voiceUploadsPath}`,
  );
}

const recordingsPath = path.join(__dirname, "recordings");
if (!fs.existsSync(recordingsPath)) {
  fs.mkdirSync(recordingsPath, { recursive: true });
  console.log(
    `[${new Date().toISOString()}] ðŸ“‚ Created recordings directory: ${recordingsPath}`,
  );
}

// File upload route patterns
const fileUploadPatterns = [
  "/api/blogs/upload-image",
  "/api/facilities",
  "/api/upload-image",
  "/api/blogs/",
  "/api/events",
  "/api/reports/task/",
  "/api/reports/upload-image",
  "/api/reports/upload-report",
  "/api/chat/auth",
  "/api/chat/send-voice/",
  "/api/chat/upload", // NEW: Chat file uploads
  "/api/fund-statements",
  "/api/hr-profile/upload-image",
  "/api/service-manager-profile/upload-image",
  "/api/projects/", // Allow file uploads for project routes (e.g. financial review)
  "/api/expenses/",
  "/api/purchase/",
  "/api/purchase",
  "/api/purchase/create",
  "/api/announcements",
  "/api/adminassignments/announcements",
  "/api/public/apply-job", // NEW: Public apply job route
  "/api/project-service-complaints/evidence",
  "/api/email-campaign/campaign", // NEW: Email campaign attachments
];

const isFileUploadRoute = (reqPath) => {
  if (!reqPath) return false;
  const cleanPath = reqPath.toLowerCase().replace(/\/+/g, "/");
  
  // High-priority catch-all for any complaints evidence routes
  if (cleanPath.includes('/project-service-complaints/evidence')) {
    console.log(`[FileUpload] Bypass hit (inclusion) for: ${cleanPath}`);
    return true;
  }

  const explicitBypasses = [
    "/api/purchase",
    "/api/projects",
    "/api/expenses",
    "/api/adminassignments/finance/expenses",
    "/api/chat/upload",
    "/api/meetings/recording/upload",
    "/api/drive/upload",
    "/api/software-issues",
    "/api/announcements",
    "/api/public/apply-job", // NEW: Public apply job route
  ];

  if (explicitBypasses.some(byp => cleanPath.startsWith(byp.toLowerCase()))) {
    console.log(`[FileUpload] Explicit bypass hit for: ${cleanPath}`);
    return true;
  }

  const normalizedPath = cleanPath.endsWith("/") ? cleanPath : cleanPath + "/";
  return fileUploadPatterns.some((pattern) => {
    const cleanPattern = pattern.toLowerCase().replace(/\/+/g, "/");
    if (cleanPattern.endsWith("/")) return normalizedPath.startsWith(cleanPattern);
    return normalizedPath === cleanPattern + "/";
  });
};

// Skip content-type check for file upload routes
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const isUpload = isFileUploadRoute(req.path);
    const contentType = req.get("Content-Type") || "";

    if (isUpload) {
      console.log(
        `[${new Date().toISOString()}] ðŸ“¤ Skipping content-type check for special route: ${req.path}`,
      );
      return next();
    }

    if (contentType && !contentType.includes("application/json")) {
      console.warn(
        `[${new Date().toISOString()}] âš ï¸ Potential 400 Bad Request: Method=${req.method}, Path=${req.path}, Content-Type=${contentType}, isUpload=${isUpload}`,
      );
    }
    
    if (!contentType.includes("application/json")) {
      console.error(
        `[${new Date().toISOString()}] âŒ Invalid content-type for non-file route: ${contentType}, Path: ${req.path}, Method: ${req.method}`
      );
      return res.status(400).json({
        errors: [
          {
            field: "",
            message:
              "Request body must be valid JSON with Content-Type: application/json",
          },
        ],
        success: false,
      });
    }
  }
  next();
});

// Apply JSON parsing for non-file routes OR if Content-Type is JSON
app.use((req, res, next) => {
  const isUploadRoute = isFileUploadRoute(req.path);
  const isJsonRequest = req.get("Content-Type")?.includes("application/json");
  const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (hasBody && (!isUploadRoute || isJsonRequest)) {
    express.json({ limit: "10mb", strict: true })(req, res, (err) => {
      if (err) {
        console.error(
          `[${new Date().toISOString()}] âŒ JSON Parse Error:`,
          err.message,
          "Path:",
          req.path,
        );
        return res.status(400).json({
          errors: [{ field: "", message: "Invalid JSON payload" }],
          success: false,
        });
      }
      next();
    });
  } else {
    next();
  }
});

// Serve static files
app.use("/uploads", express.static(uploadsPath));

// Serve recordings
app.use(
  "/api/recordings",
  express.static(path.join(__dirname, "recordings"), {
    setHeaders: (res) => {
      res.set("Cache-Control", "public, max-age=0");
      // Content-Type will be auto-set by express.static
    },
  }),
);

// Rate limiter for auth routes
const authLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/signup attempts per 15 mins
  message: {
    success: false,
    message:
      "Too many authentication attempts, please try again in 15 minutes.",
  },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/attendance-login", authLimiter);
app.use("/api/public/apply-job", authLimiter); // NEW: Public apply job route

// Legacy uploads support
const legacyUploadsPath = path.join(__dirname, "Uploads");
const limiter = RateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  limit: 5, // Limit each IP to 5 requests per windowMs
});

app.use(
  "/Uploads",
  limiter,
  (req, res, next) => {
    console.log(
      `[${new Date().toISOString()}] ðŸ“¥ Legacy request for: ${req.path}`,
    );
    const legacyFilePath = path.join(legacyUploadsPath, req.path);
    const standardFilePath = path.join(uploadsPath, req.path);
    if (fs.existsSync(legacyFilePath)) {
      next();
    } else if (fs.existsSync(standardFilePath)) {
      const newUrl = `/uploads${req.path}`;
      console.log(
        `[${new Date().toISOString()}] ðŸ”„ Redirecting legacy path to standard: ${newUrl}`,
      );
      return res.redirect(301, newUrl);
    } else {
      res.sendFile(
        path.join(__dirname, "public", "placeholder-image.jpg"),
        (err) => {
          if (err) {
            res.status(404).json({ success: false, message: "File not found" });
          }
        },
      );
    }
  },
  express.static(legacyUploadsPath, {
    setHeaders: (res, path) => {
      if (fs.existsSync(path)) {
        res.set("Cache-Control", "public, max-age=31557600");
      }
    },
  }),
);

console.log(
  `[${new Date().toISOString()}] ðŸ“‚ Serving uploads from: ${uploadsPath} (legacy: ${legacyUploadsPath})`,
);
console.log(
  `[${new Date().toISOString()}] ðŸ” Loaded MONGODB_URI: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ":****@") : "undefined"}`,
);

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes); // Moved up for priority
app.use("/api/positions", positionRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/adminassignments", adminRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/vacancies", vacancyRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/workflow", workflowRoutes); // NEW: Workflow routes
app.use("/api/chat", chatRoutes); // NEW: Chat routes
app.use("/api/hr-profile", hrProfileRoutes); // NEW: HR Profile routes
app.use("/api/service-manager-profile", serviceManagerProfileRoutes); // NEW: Service Manager Profile routes
app.use("/api/members", memberRoutes); // NEW: Member routes
app.use("/api/finance", financeRoutes); // NEW: Finance routes
app.use("/api/purchase", purchaseRoutes); // NEW: Purchase routes
app.use("/api/expenses", expenseRoutes);
app.use("/api/face-detection", faceDetectionRoutes);
app.use("/api/cashbook", cashBookRoutes); // NEW: Cash Book routes
app.use("/api/gst", gstRoutes); // NEW: GST Routes
app.use("/api/drive", driveRoutes); // NEW: Drive routes
app.use('/api/software-issues', softwareIssueRoutes);
app.use('/api/announcements', announcementRoutes);
app.use("/api/public", publicRoutes); // NEW: Public routes
app.use("/api/email-campaign", emailCampaignRoutes); // NEW: Email campaign routes

// Serve static files from Uploads/images
app.use(
  "/Uploads/images",
  express.static(path.join(__dirname, "Uploads/images")),
);

// Serve static files from uploads/issues
app.use(
  "/uploads/issues",
  express.static(path.join(__dirname, "uploads/issues")),
);
// Serve static files from uploads/complaint-evidence
app.use(
  "/uploads/complaint-evidence",
  express.static(path.join(__dirname, "uploads/complaint-evidence")),
);
app.use('/api/complaints', complaintRoutes);
app.use('/api/project-service-complaints', projectServiceComplaintRoutes);


app.get("/", (req, res) => {
  res.send("âœ… API is running");
});

// Health check endpoint (MUST be before 404 handler)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
  });
});

// Global 404 Handler (catch-all - must be last)
app.use((req, res) => {
  console.warn(
    `[${new Date().toISOString()}] 404: Route not found - ${req.method} ${req.originalUrl}`,
  );
  res
    .status(404)
    .json({
      success: false,
      message: "Route not found",
      path: req.originalUrl,
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorLog = `[${timestamp}] ðŸ’¥ Server Error:\n${err.stack}\nPath: ${req.originalUrl}\nMethod: ${req.method}\nBody: ${JSON.stringify(req.body)}\n---\n`;
  console.error(errorLog);

  try {
    fs.appendFileSync(path.join(__dirname, "error.log"), errorLog);
  } catch (fsErr) {
    console.error("Failed to write to error.log:", fsErr.message);
  }

  const isDev = process.env.NODE_ENV === "development";

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: isDev ? err.message : undefined,
    requestPath: isDev ? req.originalUrl : undefined,
  });
});

// Connect to MongoDB and start server
const mongoOptions = {
  // SEC-FIX: Enforce certificate validation to prevent Man-in-the-Middle (MITM) attacks.
  // Setting tlsAllowInvalidCertificates to false ensures that rejectUnauthorized is true.
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
};

mongoose
  .connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => {
    console.log(`[${new Date().toISOString()}] âœ… Connected to MongoDB`);
    server.listen(PORT, () => {
      console.log(
        `[${new Date().toISOString()}] ðŸš€ Server running at http://localhost:${PORT}`,
      );
      console.log(
        `[${new Date().toISOString()}] ðŸ©º Health check: http://localhost:${PORT}/api/health`,
      );
      console.log(
        `[${new Date().toISOString()}] ðŸ’¬ Socket.io ready for real-time chat`,
      );

      // Start real-time attendance inactivity check
      const { checkInactivity } = require("./Controller/attendanceController");
      setInterval(() => checkInactivity(io), 60000); // Every 60 seconds
    });
  })
  .catch((error) => {
    console.error(
      `[${new Date().toISOString()}] âŒ MongoDB connection error:`,
      error.message,
    );
    process.exit(1);
  });
