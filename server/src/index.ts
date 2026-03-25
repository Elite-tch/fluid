import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { loadConfig } from "./config";
import { feeBumpHandler } from "./handlers/feeBump";
import { apiKeyMiddleware } from "./middleware/apiKeys";
import { apiKeyRateLimit } from "./middleware/rateLimit";
import { initializeLedgerMonitor } from "./workers/ledgerMonitor";
import { transactionStore } from "./workers/transactionStore";
import { notFoundHandler, globalErrorHandler } from "./middleware/errorHandler";
import { AppError } from "./errors/AppError";

dotenv.config();

const app = express();
app.use(express.json());

const config = loadConfig();

// Configure rate limiter
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: { error: "Too many requests from this IP, please try again later.", code: "RATE_LIMITED" },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration with origin validation
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      callback(null, false);
      return;
    }

    // Check if the origin is in the allowed list
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Reject the request - pass error to trigger error handler
    callback(new Error("Origin not allowed by CORS"), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Error handler for CORS rejections
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.message === "Origin not allowed by CORS") {
    return next(new AppError("CORS not allowed", 403, "AUTH_FAILED"));
  }
  next(err);
});

// Routes
app.get("/health", (req: Request, res: Response) => {
  const accounts = config.feePayerAccounts.map((a) => ({
    publicKey: a.publicKey,
    status: "active",
  }));
  res.json({
    status: "ok",
    fee_payers: accounts,
    total: accounts.length,
  });
});

app.post(
  "/fee-bump",
  apiKeyMiddleware,
  apiKeyRateLimit,
  limiter,
  (req: Request, res: Response, next: NextFunction) => {
    feeBumpHandler(req, res, config, next);
  },
);

// Test endpoint to manually add a pending transaction
app.post("/test/add-transaction", (req: Request, res: Response) => {
  const { hash, status = "pending" } = req.body;
  if (!hash) {
    return res.status(400).json({ error: "Transaction hash is required" });
  }
  transactionStore.addTransaction(hash, status);
  res.json({ message: `Transaction ${hash} added with status ${status}` });
});

// Test endpoint to view all transactions
app.get("/test/transactions", (req: Request, res: Response) => {
  const transactions = transactionStore.getAllTransactions();
  res.json({ transactions });
});

// 404 - must come after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

// Initialize ledger monitor worker if Horizon URL is configured
let ledgerMonitor: any = null;
if (config.horizonUrl) {
  try {
    ledgerMonitor = initializeLedgerMonitor(config);
    ledgerMonitor.start();
    console.log("Ledger monitor worker started");
  } catch (error) {
    console.error("Failed to start ledger monitor:", error);
  }
} else {
  console.log("No Horizon URL configured - ledger monitor disabled");
}

app.listen(PORT, () => {
  console.log(`Fluid server running on http://0.0.0.0:${PORT}`);
  console.log(`Fee payers loaded: ${config.feePayerAccounts.length}`);
  config.feePayerAccounts.forEach((a, i) => {
    console.log(`  [${i + 1}] ${a.publicKey}`);
  });
});