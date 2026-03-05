import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Stripe
let stripeInstance: any = null;
const initializeStripe = async () => {
  try {
    // Skip Stripe initialization if explicitly disabled
    if (process.env.SKIP_STRIPE === "true") {
      console.log("Stripe disabled by SKIP_STRIPE=true");
      return null;
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.warn(
        "STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.",
      );
      return null;
    }

    const { default: Stripe } = await import("stripe");
    stripeInstance = new Stripe(stripeSecretKey);
    console.log("Stripe initialized successfully");
    return stripeInstance;
  } catch (error: any) {
    console.warn("Stripe not available:", error.message);
    return null;
  }
};

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";
const PORT = Number(process.env.PORT) || 3000;

console.log(
  `Starting server in ${process.env.NODE_ENV || "development"} mode...`,
);
console.log(`Target port: ${PORT}`);

// Initialize Database
async function startServer() {
  console.log("Initializing database...");
  let db: Database.Database;
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const dbPath = isProduction
      ? path.join("/tmp", "database.sqlite")
      : path.join(__dirname, "database.sqlite");

    console.log(`Using database at: ${dbPath}`);

    db = new Database(dbPath);
    // Create Tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_paid BOOLEAN DEFAULT 0,
        stripe_customer_id TEXT,
        subscription_id TEXT,
        subscription_status TEXT,
        subscription_end_date INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS payment_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        stripe_session_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        plan TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Debug middleware
  app.use((req, res, next) => {
    if (req.url?.startsWith("/api/")) {
      console.log(`API: ${req.method} ${req.url}`);
    }
    next();
  });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Test endpoint
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!", timestamp: Date.now() });
  });

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare(
        "INSERT INTO users (email, password) VALUES (?, ?)",
      );
      const result = stmt.run(email, hashedPassword);

      const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET);
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });
      res.json({ id: result.lastInsertRowid, email, is_paid: false });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_paid: user.is_paid },
      JWT_SECRET,
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.json({ id: user.id, email: user.email, is_paid: !!user.is_paid });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const user: any = db
      .prepare("SELECT id, email, is_paid FROM users WHERE id = ?")
      .get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ...user, is_paid: !!user.is_paid });
  });

  // Stripe Payment Routes
  const stripeRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many payment requests, try again later." },
  });

  app.post(
    "/api/stripe/create-checkout-session",
    stripeRateLimit,
    authenticate,
    async (req: any, res) => {
      try {
        const stripe = stripeInstance || (await initializeStripe());
        if (!stripe) {
          return res
            .status(503)
            .json({ error: "Payment processing unavailable" });
        }

        const { priceId, plan, successUrl, cancelUrl } = req.body;

        if (!priceId || !plan || !successUrl || !cancelUrl) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const user: any = db
          .prepare("SELECT * FROM users WHERE id = ?")
          .get(req.user.id);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        let customerId = user.stripe_customer_id;

        // Create customer if doesn't exist
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: { userId: user.id.toString() },
          });
          customerId = customer.id;

          db.prepare(
            "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
          ).run(customerId, user.id);
        }

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          mode: "subscription",
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { userId: user.id.toString(), plan: plan },
        });

        // Store payment session
        const sessionId = `ps_${Date.now()}`;
        const amount = plan === "pro" ? 1000 : 0;
        db.prepare(
          `
        INSERT INTO payment_sessions (id, user_id, stripe_session_id, amount, plan, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `,
        ).run(sessionId, user.id, session.id, amount, plan);

        res.json({ sessionId: session.id, url: session.url });
      } catch (error: any) {
        console.error("Stripe checkout error:", error);
        res
          .status(500)
          .json({
            error: error.message || "Failed to create checkout session",
          });
      }
    },
  );

  app.post(
    "/api/stripe/verify-payment",
    authenticate,
    async (req: any, res) => {
      try {
        const stripe = stripeInstance || (await initializeStripe());
        if (!stripe) {
          return res
            .status(503)
            .json({ error: "Payment processing unavailable" });
        }

        const { sessionId } = req.body;
        if (!sessionId) {
          return res.status(400).json({ error: "Missing session ID" });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (
          session.payment_status === "paid" &&
          session.metadata.userId === req.user.id.toString()
        ) {
          const plan = session.metadata.plan;
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          const endDate = Date.now() + thirtyDaysInMs;

          db.prepare(
            `
          UPDATE users SET 
            is_paid = 1, 
            subscription_id = ?, 
            subscription_status = 'active',
            subscription_end_date = ?
          WHERE id = ?
        `,
          ).run(session.subscription, endDate, req.user.id);

          db.prepare(
            `
          UPDATE payment_sessions SET status = 'completed' 
          WHERE stripe_session_id = ?
        `,
          ).run(sessionId);

          res.json({ success: true, plan, endDate, sessionId });
        } else {
          res.json({ success: false, plan: "free", endDate: 0 });
        }
      } catch (error: any) {
        console.error("Payment verification error:", error);
        res.status(500).json({ error: "Failed to verify payment" });
      }
    },
  );

  // Projects Routes
  app.get("/api/projects", authenticate, (req: any, res) => {
    const projects = db
      .prepare(
        "SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC",
      )
      .all(req.user.id);
    res.json(projects.map((p: any) => ({ ...p, data: JSON.parse(p.data) })));
  });

  app.post("/api/projects", authenticate, (req: any, res) => {
    const { id, name, data } = req.body;
    const stmt = db.prepare(`
      INSERT INTO projects (id, user_id, name, data, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(id, req.user.id, name, JSON.stringify(data));
    res.json({ success: true });
  });

  app.post("/api/auth/upgrade", authenticate, (req: any, res) => {
    db.prepare("UPDATE users SET is_paid = 1 WHERE id = ?").run(req.user.id);
    res.json({ success: true, is_paid: true });
  });

  // Vite middleware for development - AFTER all API routes
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      console.log(`Serving index.html from: ${indexPath}`);
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("API routes registered successfully");
  });
}

startServer();
