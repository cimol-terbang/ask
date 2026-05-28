import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { conversations } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { ADMIN_SECRET } from '$env/static/private';

function checkAuth(request) {
	const auth = request.headers.get('x-admin-secret');
	if (auth !== ADMIN_SECRET) {
		throw error(401, 'Unauthorized');
	}
}

// POST /api/admin/conversations/:id/close
export async function POST({ params, request }) {
	checkAuth(request);
	const id = parseInt(params.id);

	await db
		.update(conversations)
		.set({ status: 'closed', closedAt: new Date() })
		.where(eq(conversations.id, id));

	return json({ success: true });
}
