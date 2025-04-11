import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema from original file
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Report file schema
export const reportFiles = pgTable("report_files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
});

export const insertReportFileSchema = createInsertSchema(reportFiles).pick({
  name: true,
  path: true,
  uploadedAt: true,
});

export type InsertReportFile = z.infer<typeof insertReportFileSchema>;
export type ReportFile = {
  id: string;
  name: string;
  file: File;
};

// Type for parsed report data
export type ParsedReport = {
  fileName: string;
  color?: string;
  metrics: Record<string, any>;
  inputs?: Record<string, any>;
  deals?: any[];
};

// Schema for report data
export const reportDataSchema = z.object({
  fileName: z.string(),
  metrics: z.record(z.any()),
  inputs: z.record(z.any()).optional(),
  deals: z.array(z.any()).optional(),
});

export type ReportData = z.infer<typeof reportDataSchema>;
