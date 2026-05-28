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

// DELETE /api/admin/conversations/:id
export async function DELETE({ params, request }) {
	checkAuth(request);
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(400, 'Invalid conversation ID');

	await db.delete(conversations).where(eq(conversations.id, id));

	return json({ success: true });
}
