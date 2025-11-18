require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");

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

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow mobile / Postman / health checks

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Blocked by CORS: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Respond to all OPTIONS (preflight)
app.options("*", cors());

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

    app.listen(PORT, () => {
      console.log(`SpeciCare server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });

module.exports = app;
