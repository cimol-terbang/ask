import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { conversations, messages } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

// GET /api/conversations/:sessionId/messages
export async function GET({ params }) {
	const { sessionId } = params;

	const conv = await db.query.conversations.findFirst({
		where: eq(conversations.sessionId, sessionId)
	});

	if (!conv) {
		return json({ messages: [] });
	}

	const msgs = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, conv.id))
		.orderBy(messages.createdAt);

	return json({ messages: msgs });
}

// POST /api/conversations/:sessionId/messages
export async function POST({ params, request }) {
	const { sessionId } = params;
	const body = await request.json();
	const { content, title, imageUrl } = body;

	if (!content?.trim() && !imageUrl) {
		throw error(400, 'Content or image is required');
	}

	// Upsert conversation
	let conv = await db.query.conversations.findFirst({
		where: eq(conversations.sessionId, sessionId)
	});

	if (!conv) {
		const [created] = await db
			.insert(conversations)
			.values({
				sessionId,
				title: title || content?.slice(0, 60) || 'Image',
				status: 'active'
			})
			.returning();
		conv = created;
	}

	if (conv.status === 'closed') {
		throw error(403, 'Conversation is closed');
	}

	const [msg] = await db
		.insert(messages)
		.values({
			conversationId: conv.id,
			role: 'user',
			content: content?.trim() ?? '',
			imageUrl: imageUrl ?? null
		})
		.returning();

	return json({ message: msg }, { status: 201 });
}
