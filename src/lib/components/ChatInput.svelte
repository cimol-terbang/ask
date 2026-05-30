<script>
	/** @type {string} */
	let {
		value = $bindable(''),
		placeholder = 'Type a message…',
		sending = false,
		onsend,
		onattach
	} = $props();

	/** @type {File[]} */
	let attachedFiles = $state([]);
	/** @type {string[]} preview object URLs */
	let previews = $state([]);

	let fileInput = $state(null);

	function openFilePicker() {
		fileInput?.click();
	}

	function onFileChange(e) {
		const files = Array.from(e.target.files ?? []);
		for (const file of files) {
			if (attachedFiles.length >= 4) break; // max 4 images
			attachedFiles = [...attachedFiles, file];
			previews = [...previews, URL.createObjectURL(file)];
		}
		// reset input so same file can be re-selected
		e.target.value = '';
	}

	function removeImage(i) {
		URL.revokeObjectURL(previews[i]);
		attachedFiles = attachedFiles.filter((_, idx) => idx !== i);
		previews = previews.filter((_, idx) => idx !== i);
	}

	// Expose files to parent via callback, called by parent's send handler
	export function getAttachedFiles() { return attachedFiles; }
	export function clearAttachments() {
		previews.forEach(URL.revokeObjectURL);
		attachedFiles = [];
		previews = [];
	}

	const canSend = $derived(!sending && (value.trim().length > 0 || attachedFiles.length > 0));
</script>

<div class="input-area">
	<!-- Image previews strip -->
	{#if previews.length > 0}
		<div class="preview-strip">
			{#each previews as src, i}
				<div class="preview-item">
					<img {src} alt="attachment {i + 1}" class="preview-img" />
					<button class="preview-remove" onclick={() => removeImage(i)} aria-label="Remove image">
						<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<div class="input-row">
		<!-- Attach button -->
		<button
			class="attach-btn"
			onclick={openFilePicker}
			disabled={sending || attachedFiles.length >= 4}
			aria-label="Attach image"
			title="Attach image (max 4)"
			type="button"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
				<polyline points="21 15 16 10 5 21"/>
			</svg>
		</button>

		<input
			bind:this={fileInput}
			type="file"
			accept="image/jpeg,image/png,image/gif,image/webp"
			multiple
			class="file-input-hidden"
			onchange={onFileChange}
			aria-hidden="true"
			tabindex="-1"
		/>

		<textarea
			bind:value
			{placeholder}
			disabled={sending}
			rows="3"
			class="chat-input"
		></textarea>
	</div>

	<button
		class="send-btn"
		onclick={onsend}
		disabled={!canSend}
		aria-label="Send"
	>
		{#if sending}
			<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10" style="animation: spin 0.8s linear infinite"/>
			</svg>
		{:else}
			<svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
				<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
			</svg>
		{/if}
	</button>
</div>

<style>
	@keyframes spin { to { transform: rotate(360deg); } }

	.input-area {
		padding: 8px 20px 16px;
		background: transparent;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	@media (max-width: 480px) {
		.input-area { padding: 6px 14px 14px; }
	}

	/* ── Preview strip ── */
	.preview-strip {
		display: flex; gap: 8px; flex-wrap: wrap;
		padding: 0 2px;
	}
	.preview-item {
		position: relative; flex-shrink: 0;
	}
	.preview-img {
		width: 64px; height: 64px; object-fit: cover;
		border-radius: var(--mn-radius-xs);
		border: 1.5px solid var(--mn-border-soft);
		display: block;
	}
	.preview-remove {
		position: absolute; top: -6px; right: -6px;
		width: 18px; height: 18px; border-radius: 50%;
		background: #ef4444; color: #fff; border: none;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; padding: 0;
		box-shadow: 0 1px 4px rgba(0,0,0,0.3);
	}

	/* ── Input row ── */
	.input-row {
		flex: 1; min-width: 0;
		display: flex; gap: 8px; align-items: center;
		background: var(--mn-bg);
		border: 1.5px solid var(--mn-border-soft);
		border-radius: var(--mn-radius);
		padding: 10px 14px;
		box-shadow: var(--mn-shadow);
		transition: border-color var(--mn-transition), box-shadow var(--mn-transition);
	}
	.input-row:focus-within {
		border-color: var(--mn-accent);
		box-shadow: var(--mn-shadow), 0 0 0 3px var(--mn-accent-soft);
	}

	/* ── Attach button ── */
	.attach-btn {
		flex-shrink: 0; width: 32px; height: 32px;
		display: flex; align-items: center; justify-content: center;
		background: none; border: none; border-radius: var(--mn-radius-xs);
		color: var(--mn-text-subtle); cursor: pointer;
		transition: all var(--mn-transition); padding: 0;
	}
	.attach-btn:hover:not(:disabled) { color: var(--mn-accent); background: var(--mn-accent-soft); }
	.attach-btn:disabled { opacity: 0.35; cursor: not-allowed; }

	.file-input-hidden { display: none; }

	/* ── Textarea ── */
	.chat-input {
		flex: 1; min-width: 0; resize: none;
		border: none; background: transparent;
		color: var(--mn-text); font-family: inherit;
		font-size: 0.9rem; line-height: 1.5;
		padding: 0; outline: none;
		min-height: 44px; max-height: 140px;
		overflow-y: auto;
	}
	.chat-input:focus { box-shadow: none; border-color: transparent; }
	.chat-input::placeholder { color: var(--mn-text-subtle); }
	.chat-input:disabled { opacity: 0.5; cursor: not-allowed; }

	/* ── Send button ── */
	.input-area > .send-btn {
		/* send button sits outside input-row, aligned to the right */
		align-self: flex-end;
	}
	.send-btn {
		width: 44px; height: 44px; flex-shrink: 0;
		border-radius: 50%; border: none;
		background: transparent; color: var(--mn-accent);
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; transition: all var(--mn-transition);
	}
	.send-btn:hover:not(:disabled) { background: var(--mn-accent-soft); color: var(--mn-accent-hover); }
	.send-btn:disabled { opacity: 0.35; cursor: not-allowed; color: var(--mn-text-subtle); }
</style>
