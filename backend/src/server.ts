import express from "express";
import cors from "cors";

import arduinoRoutes from "./routes/arduino.routes.js";

const app = express();

const PORT = 7000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: "http://localhost:3300",
  })
);

app.use(
  express.json({
    limit: "256kb",
  })
);

// =====================================================
// ROUTES
// =====================================================

app.use("/api/arduino", arduinoRoutes);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: `Circuit Simulator Backend is running: ${PORT}`,
  });
});


// =====================================================
// SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(
    `🚀 Backend running at http://localhost:${PORT}`
  );
});