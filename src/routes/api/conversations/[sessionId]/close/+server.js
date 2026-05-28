import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { conversations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

// POST /api/conversations/:sessionId/close
export async function POST({ params }) {
	const { sessionId } = params;

	const conv = await db.query.conversations.findFirst({
		where: eq(conversations.sessionId, sessionId)
	});

	if (!conv) {
		throw error(404, 'Conversation not found');
	}

	await db
		.update(conversations)
		.set({ status: 'closed', closedAt: new Date() })
		.where(eq(conversations.sessionId, sessionId));

	return json({ success: true });
}
