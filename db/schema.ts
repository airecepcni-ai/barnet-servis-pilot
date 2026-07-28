import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const knowledgeSettings = sqliteTable("knowledge_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const libraryFiles = sqliteTable("library_files", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  r2Key: text("r2_key").notNull(),
  openaiFileId: text("openai_file_id"),
  vectorStoreFileId: text("vector_store_file_id"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
