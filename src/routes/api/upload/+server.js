import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/upload
export async function POST({ request }) {
	const formData = await request.formData();
	const file = formData.get('file');

	if (!file || typeof file === 'string') {
		throw error(400, 'No file provided');
	}
	if (!ALLOWED_TYPES.includes(file.type)) {
		throw error(400, 'Only JPEG, PNG, GIF, and WebP images are allowed');
	}
	if (file.size > MAX_SIZE_BYTES) {
		throw error(400, 'File too large (max 5 MB)');
	}

	const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
	const filename = `${crypto.randomUUID()}.${ext}`;

	const arrayBuffer = await file.arrayBuffer();
	const buffer = new Uint8Array(arrayBuffer);

	const { error: uploadError } = await supabase.storage
		.from('ask-images')
		.upload(filename, buffer, { contentType: file.type, upsert: false });

	if (uploadError) {
		console.error('[upload] supabase error:', uploadError.message);
		throw error(500, 'Upload failed');
	}

	const { data: { publicUrl } } = supabase.storage
		.from('ask-images')
		.getPublicUrl(filename);

	return json({ url: publicUrl });
}
