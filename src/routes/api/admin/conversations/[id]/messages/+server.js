import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { conversations, messages } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { ADMIN_SECRET } from '$env/static/private';

function checkAuth(request) {
	const auth = request.headers.get('x-admin-secret');
	if (auth !== ADMIN_SECRET) {
		throw error(401, 'Unauthorized');
	}
}

// GET /api/admin/conversations/:id/messages
export async function GET({ params, request }) {
	checkAuth(request);
	const id = parseInt(params.id);

	const msgs = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, id))
		.orderBy(messages.createdAt);

	return json({ messages: msgs });
}

// POST /api/admin/conversations/:id/messages — admin reply
export async function POST({ params, request }) {
	checkAuth(request);
	const id = parseInt(params.id);
	const body = await request.json();
	const { content, imageUrl } = body;

	if (!content?.trim() && !imageUrl) {
		throw error(400, 'Content or image is required');
	}

	const conv = await db.query.conversations.findFirst({
		where: eq(conversations.id, id)
	});

	if (!conv) {
		throw error(404, 'Conversation not found');
	}

	if (conv.status === 'closed') {
		throw error(403, 'Conversation is closed');
	}

	const [msg] = await db
		.insert(messages)
		.values({
			conversationId: id,
			role: 'admin',
			content: content?.trim() ?? '',
			imageUrl: imageUrl ?? null
		})
		.returning();

	return json({ message: msg }, { status: 201 });
}
