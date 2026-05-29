import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { conversations, messages } from '$lib/server/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { ADMIN_SECRET } from '$env/static/private';

function checkAuth(request) {
	const auth = request.headers.get('x-admin-secret');
	if (auth !== ADMIN_SECRET) {
		throw error(401, 'Unauthorized');
	}
}

// GET /api/admin/conversations?status=active|closed
// Returns conversations sorted by latest message, with lastMessageAt and lastUserMessageAt
export async function GET({ request, url }) {
	checkAuth(request);
	const status = url.searchParams.get('status') || 'active';

	// Subquery: latest message timestamp per conversation
	const lastMsg = db
		.select({
			conversationId: messages.conversationId,
			lastMessageAt: sql`MAX(${messages.createdAt})`.as('last_message_at'),
			lastUserMessageAt: sql`MAX(CASE WHEN ${messages.role} = 'user' THEN ${messages.createdAt} END)`.as('last_user_message_at')
		})
		.from(messages)
		.groupBy(messages.conversationId)
		.as('last_msg');

	const convs = await db
		.select({
			id: conversations.id,
			sessionId: conversations.sessionId,
			title: conversations.title,
			status: conversations.status,
			createdAt: conversations.createdAt,
			closedAt: conversations.closedAt,
			lastMessageAt: lastMsg.lastMessageAt,
			lastUserMessageAt: lastMsg.lastUserMessageAt
		})
		.from(conversations)
		.leftJoin(lastMsg, eq(conversations.id, lastMsg.conversationId))
		.where(eq(conversations.status, status))
		.orderBy(desc(sql`COALESCE(${lastMsg.lastMessageAt}, ${conversations.createdAt})`));

	return json({ conversations: convs });
}
