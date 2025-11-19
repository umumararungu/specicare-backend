require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');

// Import middleware
const {
  securityHeaders,
  authLimiter,
  apiLimiter,
} = require("./middleware/validation");

// Sequelize instance
const { sequelize } = require("./models");

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------------------------------
   1. CORS — MUST BE THE FIRST MIDDLEWARE
-------------------------------------------- */

// Build allowed origins from env or sensible defaults. Support comma-separated
// FRONTEND_ORIGINS for flexibility in deployment (e.g. Railway).
const rawOrigins = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || "";
const allowedOrigins = rawOrigins
  .split(",")
  .map((s) => s && s.trim())
  .filter(Boolean)
  .concat([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://specicare-frontend-production.up.railway.app",
  ])
  .filter((v, i, a) => a.indexOf(v) === i);

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, Postman) which have no Origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`Blocked by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Respond to all OPTIONS (preflight)
app.options("*", cors());

// Dev request logger: prints each incoming request (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    try {
      console.log(`${new Date().toISOString()} ${req.ip} ${req.method} ${req.originalUrl}`);
    } catch (e) {
      // ignore logging errors
    }
    next();
  });
}

/* -------------------------------------------
   2. SECURITY + BODY PARSING
-------------------------------------------- */

app.use(securityHeaders);
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

/* -------------------------------------------
   3. STATIC FILES
-------------------------------------------- */

const uploadsDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));

/* -------------------------------------------
   4. RATE LIMITERS
-------------------------------------------- */

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

/* -------------------------------------------
   5. HEALTH CHECK
-------------------------------------------- */

app.get("/api/health", (req, res) => res.send("Server is running"));

/* -------------------------------------------
   6. API ROUTES
-------------------------------------------- */

app.use("/api/appointments", require("./routes/appointment"));
app.use("/api/medical-test", require("./routes/medicalTest"));
app.use("/api/users", require("./routes/users"));
app.use("/api/test-results", require("./routes/testResult"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/hospitals", require("./routes/hospital"));
app.use("/api/config", require("./routes/config"));
app.use("/api/notifications", require("./routes/notifications"));

/* -------------------------------------------
   7. 404 HANDLER
-------------------------------------------- */

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

/* -------------------------------------------
   8. GLOBAL ERROR HANDLER
-------------------------------------------- */

app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }

  res.status(500).json({
    success: false,
    message: error.message,
    stack: error.stack,
  });
});

/* -------------------------------------------
   9. START SERVER AFTER DB CONNECTS
-------------------------------------------- */

sequelize
  .authenticate()
  .then(() => {
    console.log("Database connected successfully.");

    return sequelize.sync();
  })
  .then(() => {
    console.log("Database synced.");

    // Create HTTP server and attach Socket.IO
    const server = http.createServer(app);

    const io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Make io available via app.locals for controllers/services
    app.locals.io = io;
    try {
      const socketService = require('./services/socket');
      if (socketService && typeof socketService.setIo === 'function') socketService.setIo(io);
    } catch (e) {
      // non-fatal
      console.warn('Could not set socketService io:', e && e.message);
    }

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id, 'ip=', socket.handshake.address);

      socket.on('joinRoom', (room) => {
        try {
          // only allow join if socket has authenticated user
          if (socket.data && socket.data.user) {
            socket.join(room);
          } else {
            socket.emit('error', { message: 'Authentication required to join room' });
          }
        } catch (e) {}
      });

      socket.on('leaveRoom', (room) => {
        try {
          if (socket.data && socket.data.user) socket.leave(room);
        } catch (e) {}
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', socket.id, reason);
      });
    });

    // Log engine-level connection errors (handshake / upgrade failures)
    try {
      io.engine.on && io.engine.on('connection_error', (err) => {
        try {
          console.warn('Engine connection_error:', err && err.message, 'handshake:', err && err.req && err.req.headers && err.req.headers.origin);
        } catch (e) {
          console.warn('Engine connection_error (failed to print details)', e && e.message);
        }
      });
    } catch (e) {
      // ignore if engine not available
    }
    // Socket auth: require a JWT in the handshake auth (auth.token)
    io.use(async (socket, next) => {
      try {
        const tokenRaw = socket.handshake.auth && (socket.handshake.auth.token || socket.handshake.auth.accessToken) 
                          || socket.handshake.query && socket.handshake.query.token;

        if (!tokenRaw) {
          const err = new Error('Authentication required');
          err.data = { message: 'Authentication required. Please login.' };
          return next(err);
        }

        const token = typeof tokenRaw === 'string' && tokenRaw.startsWith('Bearer ') ? tokenRaw.split(' ')[1] : tokenRaw;

        const jwt = require('jsonwebtoken');
        const { User } = require('./models');

        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
          const err = new Error('Invalid token');
          err.data = { message: e.message };
          return next(err);
        }

        const user = await User.findByPk(decoded.userId, { attributes: { exclude: ['password'] } });
        if (!user) {
          const err = new Error('User not found');
          err.data = { message: 'User not found' };
          return next(err);
        }

        if (!user.is_active) {
          const err = new Error('Account is deactivated');
          err.data = { message: 'Account is deactivated' };
          return next(err);
        }

        // attach user to socket.data for later use
        socket.data.user = user;
        return next();
      } catch (err) {
        console.error('Socket auth error:', err && err.stack ? err.stack : err);
        return next(new Error('Socket authentication failed'));
      }
    });

    server.listen(PORT, () => {
      console.log(`SpeciCare server (with Socket.IO) running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });

module.exports = app;
