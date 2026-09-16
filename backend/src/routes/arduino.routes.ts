import { Router } from "express";

import {
  compileArduinoRoute,
  detectBoards,
} from "../controllers/arduino.controller.js";

const router = Router();

// =====================================================
// BOARD LIST
// =====================================================

router.get(
  "/boards",
  detectBoards
);



// =====================================================
// COMPILE
// =====================================================

router.post(
  "/compile",
  compileArduinoRoute
);

export default router;