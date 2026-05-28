<script>
	/** @type {string} */
	let { value = $bindable(''), placeholder = 'Type a message…', sending = false, onsend } = $props();
</script>

<div class="input-area">
	<div class="input-row">
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
		disabled={sending || !value.trim()}
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
		padding: 12px 20px 16px;
		background: transparent;
		flex-shrink: 0;
		display: flex;
		gap: 8px;
		align-items: center;
	}
	@media (max-width: 480px) {
		.input-area { padding: 10px 14px 14px; gap: 6px; }
	}

	.input-row {
		flex: 1; min-width: 0;
		display: flex; gap: 12px; align-items: center;
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
