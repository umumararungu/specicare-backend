const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

require("dotenv").config();

// Connect PostgreSQL
const { connectDB } = require("./config/database");

// Import middleware
const {
  securityHeaders,
  authLimiter,
  apiLimiter,
  handleValidationErrors,
} = require("./middleware/validation");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database before the app starts

// Security middleware
app.use(securityHeaders);
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploads directory for files (test result attachments, etc.)
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Rate limiting
app.use("/api/auth/", authLimiter);
app.use("/api/", apiLimiter);

// Health check
app.get("/api/health", (req, res) => res.send("Server is running"));

// CORS configuration
// Allowed frontend origins
const allowedOrigins = [
  "https://specicare-frontend-production.up.railway.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow Postman / mobile apps
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("CORS policy does not allow this origin"), false);
    }
    return callback(null, true);
  },
  credentials: true, // important to allow cookies
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Cookie']
}));

app.options("*", cors);

// API routes
app.use("/api/appointments", require("./routes/appointment"));
app.use("/api/medical-test", require("./routes/medicalTest"));
app.use("/api/users", require("./routes/users"));
app.use("/api/test-results", require("./routes/testResult"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/hospitals", require("./routes/hospital"));
app.use("/api/config", require("./routes/config"));
app.use("/api/notifications", require("./routes/notifications"));

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Global error handler
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

// Start server
app.listen(PORT, () => {
  console.log(`SpeciCare server running on port ${PORT}`);
});

require("./models/index");

const { sequelize } = require("./models");

sequelize
  .sync()
  .then(() => console.log("created"))
  .catch((err) => console.error(err));

module.exports = app;
