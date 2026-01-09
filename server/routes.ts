import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertMemberSchema,
  insertProductSchema,
  insertAttendanceSchema,
  insertSubscriptionSchema,
  insertSaleSchema,
  insertExpenseSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed initial data on startup
  await storage.seedInitialData();

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/members", async (_req, res) => {
    try {
      const members = await storage.getMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to get members" });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to get member" });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const parsed = insertMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const member = await storage.createMember(parsed.data);
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to create member" });
    }
  });

  app.patch("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.updateMember(req.params.id, req.body);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to update member" });
    }
  });

  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to get product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const parsed = insertProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const product = await storage.createProduct(parsed.data);
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.get("/api/attendance", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const records = await storage.getAttendance(date);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to get attendance" });
    }
  });

  app.get("/api/attendance/:date", async (req, res) => {
    try {
      const records = await storage.getAttendance(req.params.date);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to get attendance" });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const parsed = insertAttendanceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const attendance = await storage.createAttendance(parsed.data);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to create attendance" });
    }
  });

  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const attendance = await storage.deleteAttendance(req.params.id);
      if (!attendance) {
        return res.status(404).json({ error: "Attendance not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete attendance" });
    }
  });

  app.get("/api/subscriptions", async (_req, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get subscriptions" });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const parsed = insertSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const subscription = await storage.createSubscription(parsed.data);
      res.status(201).json(subscription);
    } catch (error) {
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  app.get("/api/sales", async (_req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sales" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const parsed = insertSaleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const sale = await storage.createSale(parsed.data);
      res.status(201).json(sale);
    } catch (error) {
      res.status(500).json({ error: "Failed to create sale" });
    }
  });

  app.patch("/api/sales/:id/cancel", async (req, res) => {
    try {
      const reason = String(req.body?.reason ?? "").trim();
      if (!reason) {
        return res.status(400).json({ error: "Cancel reason is required" });
      }
      const sale = await storage.cancelSale(req.params.id, reason);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel sale" });
    }
  });

  app.get("/api/expenses", async (_req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to get expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const parsed = insertExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const expense = await storage.createExpense(parsed.data);
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const logs = await storage.getActivityLogs(Number.isNaN(limit) ? 100 : limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get logs" });
    }
  });

  return httpServer;
}
