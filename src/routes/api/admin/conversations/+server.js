import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { conversations, messages } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { ADMIN_SECRET } from '$env/static/private';

function checkAuth(request) {
	const auth = request.headers.get('x-admin-secret');
	if (auth !== ADMIN_SECRET) {
		throw error(401, 'Unauthorized');
	}
}

// GET /api/admin/conversations?status=active|closed
export async function GET({ request, url }) {
	checkAuth(request);
	const status = url.searchParams.get('status') || 'active';

	const convs = await db
		.select()
		.from(conversations)
		.where(eq(conversations.status, status))
		.orderBy(desc(conversations.createdAt));

	return json({ conversations: convs });
}
