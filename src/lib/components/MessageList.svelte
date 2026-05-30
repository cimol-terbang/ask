<script>
	/**
	 * @typedef {{ id: string, role: string, content: string, createdAt: string }} Message
	 * @type {{ messages: Message[], perspective: 'user' | 'admin', fmt: (iso: string) => string, bindEl?: HTMLElement | null }}
	 */
	let { messages, perspective, fmt, bindEl = $bindable(null) } = $props();

	// In user view:  user msgs go right (gradient), admin msgs go left (plain)
	// In admin view: admin msgs go right (gradient), user msgs go left (plain)
	function isRight(role) {
		return perspective === 'user' ? role === 'user' : role === 'admin';
	}
	function bubbleClass(role) {
		return isRight(role) ? 'bubble-sent' : 'bubble-received';
	}
	function showLabel(role) {
		return perspective === 'user' ? role === 'admin' : true;
	}
	function labelText(role) {
		if (perspective === 'user') return 'haotian';
		return role === 'admin' ? 'haotian' : 'User';
	}
</script>

<div class="messages" bind:this={bindEl}>
	{#if messages.length === 0}
		<div class="messages-empty">
			<div class="messages-empty-icon">💬</div>
			<p>No messages yet.</p>
		</div>
	{/if}
	{#each messages as msg (msg.id)}
		<div class="msg-row {isRight(msg.role) ? 'msg-right' : 'msg-left'}">
			<div class="bubble {bubbleClass(msg.role)}">
				{#if showLabel(msg.role)}
					<div class="bubble-label">{labelText(msg.role)}</div>
				{/if}
				{#if msg.imageUrl}
					<a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" class="bubble-img-link">
						<img src={msg.imageUrl} alt="attachment" class="bubble-img" loading="lazy" />
					</a>
				{/if}
				{#if msg.content}
					<p class="bubble-text">{msg.content}</p>
				{/if}
				<div class="bubble-time">{fmt(msg.createdAt)}</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.messages {
		flex: 1; overflow-y: auto; padding: 20px;
		display: flex; flex-direction: column; gap: 12px;
	}
	@media (max-width: 480px) { .messages { padding: 14px 12px; } }

	.messages-empty { margin: auto; text-align: center; color: var(--mn-text-subtle); }
	.messages-empty-icon { font-size: 2rem; margin-bottom: 8px; opacity: 0.5; }
	.messages-empty p { font-size: 0.85rem; }

	.msg-row { display: flex; }
	.msg-right { justify-content: flex-end; }
	.msg-left  { justify-content: flex-start; }

	.bubble {
		max-width: 70%; padding: 10px 14px;
		border-radius: var(--mn-radius-sm);
		font-size: 0.875rem; line-height: 1.55;
	}
	@media (max-width: 480px) { .bubble { max-width: 88%; } }

	/* sent = gradient (right side) */
	.bubble-sent {
		background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover));
		color: #fff; border-bottom-right-radius: 4px;
		box-shadow: 0 2px 8px rgba(45,124,196,0.3);
	}
	/* received = plain surface (left side) */
	.bubble-received {
		background: var(--mn-surface); color: var(--mn-text);
		border: 1px solid var(--mn-border-soft); border-bottom-left-radius: 4px;
		box-shadow: var(--mn-shadow-sm);
	}

	.bubble-label {
		font-size: 0.67rem; font-weight: 700; margin-bottom: 4px;
		color: var(--mn-accent); letter-spacing: 0.02em;
	}
	.bubble-sent .bubble-label { color: rgba(255,255,255,0.75); }

	.bubble-text { white-space: pre-wrap; word-break: break-word; }
	.bubble-time { font-size: 0.65rem; margin-top: 5px; text-align: right; opacity: 0.55; }

	.bubble-img-link { display: block; margin-bottom: 6px; }
	.bubble-img {
		max-width: 100%; max-height: 260px;
		border-radius: calc(var(--mn-radius-sm) - 4px);
		display: block; cursor: zoom-in;
		object-fit: contain;
	}
</style>
