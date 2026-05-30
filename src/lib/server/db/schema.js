import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

// Conversations table — each anonymous chat session
export const conversations = pgTable('conversations', {
	id: serial('id').primaryKey(),
	sessionId: varchar('session_id', { length: 64 }).notNull().unique(),
	title: varchar('title', { length: 100 }).notNull(),
	status: varchar('status', { length: 10 }).notNull().default('active'), // 'active' | 'closed'
	createdAt: timestamp('created_at').defaultNow().notNull(),
	closedAt: timestamp('closed_at')
});

// Messages table — individual messages in a conversation
export const messages = pgTable('messages', {
	id: serial('id').primaryKey(),
	conversationId: serial('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	role: varchar('role', { length: 10 }).notNull(), // 'user' | 'admin'
	content: text('content').notNull(),
	imageUrl: text('image_url'),                     // optional attached image
	createdAt: timestamp('created_at').defaultNow().notNull()
});
