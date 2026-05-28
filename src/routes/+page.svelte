<script>
	import { onMount, getContext } from 'svelte';
	const theme = getContext('theme');
	let isDark = $derived(theme.isDark);
	const toggleDark = theme.toggleDark;

	const LS_KEY = 'ask_sessions';
	function loadSessions() {
		if (typeof localStorage === 'undefined') return [];
		try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
	}
	function saveSessions(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

	let sessions = $state([]);
	let activeSessionId = $state(null);
	let inputText = $state('');
	let sending = $state(false);
	let showEndWarning = $state(false);
	let drawerOpen = $state(false);
	let pollingInterval = null;
	let messagesEl = $state(null);

	let activeSession = $derived(sessions.find((s) => s.sessionId === activeSessionId) ?? null);
	let activeSessions = $derived(sessions.filter((s) => s.status === 'active'));
	let closedSessions = $derived(sessions.filter((s) => s.status === 'closed'));

	onMount(() => {
		sessions = loadSessions();
		pollingInterval = setInterval(pollReplies, 5000);
		return () => clearInterval(pollingInterval);
	});

	$effect(() => {
		if (messagesEl && activeSession)
			setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 50);
	});

	async function pollReplies() {
		for (const s of sessions.filter((s) => s.status === 'active' && s.messages.length > 0)) {
			try {
				const res = await fetch(`/api/conversations/${s.sessionId}/messages`);
				if (!res.ok) continue;
				const data = await res.json();
				const existing = new Set(s.messages.map((m) => m.id));
				const newMsgs = data.messages.filter((m) => !existing.has(m.id));
				if (newMsgs.length > 0) {
					s.messages = [...s.messages, ...newMsgs];
					sessions = [...sessions];
					saveSessions(sessions);
				}
			} catch { /* ignore */ }
		}
	}

	async function sendMessage() {
		const text = inputText.trim();
		if (!text || sending) return;
		inputText = '';
		sending = true;
		if (!activeSession) {
			const sessionId = crypto.randomUUID();
			const title = text.length > 60 ? text.slice(0, 60) + '…' : text;
			sessions = [{ sessionId, title, status: 'active', messages: [] }, ...sessions];
			activeSessionId = sessionId;
		}
		const session = sessions.find((s) => s.sessionId === activeSessionId);
		if (!session.title) { session.title = text.length > 60 ? text.slice(0, 60) + '…' : text; sessions = [...sessions]; }
		const tempMsg = { id: `temp-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() };
		session.messages = [...session.messages, tempMsg];
		sessions = [...sessions];
		try {
			const res = await fetch(`/api/conversations/${session.sessionId}/messages`, {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: text, title: session.title })
			});
			if (res.ok) {
				const data = await res.json();
				session.messages = session.messages.map((m) => m.id === tempMsg.id ? data.message : m);
				sessions = [...sessions]; saveSessions(sessions);
			}
		} catch { /* keep optimistic */ } finally { sending = false; }
	}

	function startNewConversation() {
		const hasEmpty = sessions.some((s) => s.status === 'active' && s.messages.length === 0);
		if (hasEmpty) { activeSessionId = sessions.find((s) => s.status === 'active' && s.messages.length === 0).sessionId; drawerOpen = false; return; }
		const sessionId = crypto.randomUUID();
		sessions = [{ sessionId, title: '', status: 'active', messages: [] }, ...sessions];
		activeSessionId = sessionId; drawerOpen = false;
	}

	function handleKeydown(e) { /* Enter = new line, send via button only */ }

	async function endConversation() {
		showEndWarning = false;
		if (!activeSession) return;
		if (activeSession.messages.length > 0) {
			try { await fetch(`/api/conversations/${activeSession.sessionId}/close`, { method: 'POST' }); } catch { /* ignore */ }
		}
		const idx = sessions.findIndex((s) => s.sessionId === activeSession.sessionId);
		if (idx !== -1) { sessions[idx] = { ...sessions[idx], status: 'closed' }; sessions = [...sessions]; saveSessions(sessions); }
		activeSessionId = sessions.find((s) => s.status === 'active')?.sessionId ?? null;
	}

	function fmt(iso) { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
</script>

<svelte:head><title>Ask — Get Answers</title></svelte:head>

{#if showEndWarning}
<div class="modal-backdrop" role="dialog" aria-modal="true">
	<div class="modal-box">
		<div class="modal-icon">⚠️</div>
		<h3>End this conversation?</h3>
		<p>This will close the chat. You can still read it but won't be able to send new messages.</p>
		<div class="modal-actions">
			<button class="btn btn-danger" onclick={endConversation}>Yes, end it</button>
			<button class="btn btn-ghost" onclick={() => (showEndWarning = false)}>Cancel</button>
		</div>
	</div>
</div>
{/if}

{#if drawerOpen}
<div class="drawer-overlay" onclick={() => (drawerOpen = false)} role="presentation"></div>
{/if}

<div class="layout">
	<aside class="sidebar {drawerOpen ? 'drawer-open' : ''}">
		<div class="sidebar-header">
			<div class="sidebar-brand">
				<span class="brand-dot"></span>
				<span class="brand">Ask</span>
			</div>
			<div class="sidebar-header-right">
				<button class="btn btn-primary btn-new" onclick={startNewConversation}>+ New</button>
				<button class="icon-btn drawer-close" onclick={() => (drawerOpen = false)} aria-label="Close">
					<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
		</div>

		<div class="sidebar-list">
			{#if activeSessions.length > 0}
				<div class="list-section">
					<div class="list-label">Active</div>
					{#each activeSessions as s (s.sessionId)}
						<button class="conv-item {activeSessionId === s.sessionId ? 'active' : ''}" onclick={() => { activeSessionId = s.sessionId; drawerOpen = false; }}>
							<span class="conv-title">{s.title || 'New conversation…'}</span>
							<span class="conv-meta">{s.messages.length} msg{s.messages.length !== 1 ? 's' : ''}</span>
						</button>
					{/each}
				</div>
			{/if}
			{#if closedSessions.length > 0}
				<div class="list-section">
					<div class="list-label">Closed</div>
					{#each closedSessions as s (s.sessionId)}
						<button class="conv-item closed {activeSessionId === s.sessionId ? 'active' : ''}" onclick={() => { activeSessionId = s.sessionId; drawerOpen = false; }}>
							<span class="conv-title">{s.title || 'Untitled'}</span>
							<span class="pill-closed">closed</span>
						</button>
					{/each}
				</div>
			{/if}
			{#if sessions.length === 0}
				<p class="empty-hint">No conversations yet.<br/>Start by asking a question.</p>
			{/if}
		</div>
	</aside>

	<main class="main">
		<header class="navbar">
			<div class="navbar-left">
				<button class="icon-btn hamburger" onclick={() => (drawerOpen = true)} aria-label="Open menu">
					<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
					</svg>
				</button>
				{#if activeSession}
					<div class="navbar-title">
						<span class="navbar-conv-title">{activeSession.title || 'New conversation'}</span>
						<span class="pill {activeSession.status === 'active' ? 'pill-active' : 'pill-closed-badge'}">{activeSession.status}</span>
					</div>
				{:else}
					<div class="navbar-brand-area">
						<span class="brand-dot"></span>
						<span class="navbar-brand">Ask</span>
					</div>
				{/if}
			</div>
			<div class="navbar-right">
				{#if activeSession?.status === 'active'}
					<button class="btn btn-end" onclick={() => (showEndWarning = true)}>End</button>
				{/if}
				<button class="icon-btn" onclick={toggleDark} aria-label="Toggle theme">
					{#if isDark}
						<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<circle cx="12" cy="12" r="5"/>
							<line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
							<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
							<line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
							<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
						</svg>
					{:else}
						<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
						</svg>
					{/if}
				</button>
			</div>
		</header>

		{#if activeSession}
			<div class="messages" bind:this={messagesEl}>
				{#if activeSession.messages.length === 0}
					<div class="messages-empty">
						<div class="messages-empty-icon">💬</div>
						<p>Type your question below to get started.</p>
					</div>
				{/if}
				{#each activeSession.messages as msg (msg.id)}
					<div class="msg-row {msg.role === 'user' ? 'msg-right' : 'msg-left'}">
						<div class="bubble {msg.role === 'user' ? 'bubble-user' : 'bubble-admin'}">
							{#if msg.role === 'admin'}
								<div class="bubble-label">haotian</div>
							{/if}
							<p class="bubble-text">{msg.content}</p>
							<div class="bubble-time">{fmt(msg.createdAt)}</div>
						</div>
					</div>
				{/each}
			</div>

			{#if activeSession.status === 'active'}
				<div class="input-area item-center">
					<div class="input-row">
						<textarea bind:value={inputText} placeholder="Ask something…" disabled={sending} rows="3" class="chat-input"></textarea>
					</div>
					<button class="send-btn" onclick={sendMessage} disabled={sending || !inputText.trim()} aria-label="Send">
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
			{:else}
				<div class="closed-bar">This conversation is closed.</div>
			{/if}
		{:else}
			<div class="empty-state">
				<div class="empty-glow"></div>
				<div class="empty-icon">💬</div>
				<h2>Ask anything</h2>
				<p>Your questions are anonymous. An admin will reply.</p>
				<button class="btn btn-primary" onclick={startNewConversation}>Start a conversation</button>
			</div>
		{/if}
	</main>
</div>

<style>
@keyframes spin { to { transform: rotate(360deg); } }

.layout { display: flex; height: 100vh; overflow: hidden; background: var(--mn-bg); }
@media (min-width: 641px) {
	.layout { padding: 16px; gap: 16px; }
}

/* ── Sidebar ── */
.sidebar {
	width: 256px; flex-shrink: 0;
	background: var(--mn-surface);
	display: flex; flex-direction: column; overflow: hidden; z-index: 200;
	transition: transform 0.25s cubic-bezier(.4,0,.2,1);
}
@media (min-width: 641px) {
	.sidebar {
		border-radius: var(--mn-radius);
		border: 1px solid var(--mn-border-soft);
		box-shadow: var(--mn-shadow);
	}
}
.drawer-close { display: none !important; }
.hamburger { display: none !important; }
@media (max-width: 640px) {
	.sidebar { position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%); box-shadow: var(--mn-shadow-lg); }
	.sidebar.drawer-open { transform: translateX(0); }
	.drawer-close { display: flex !important; }
	.hamburger { display: flex !important; }
}
.drawer-overlay { display: none; }
@media (max-width: 640px) {
	.drawer-overlay { display: block; position: fixed; inset: 0; z-index: 199; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); }
}

.sidebar-header {
	height: 64px; padding: 0 18px;
	display: flex; align-items: center; justify-content: space-between;
	border-bottom: 1px solid rgba(168, 200, 228, 0.25);
}
.sidebar-brand { display: flex; align-items: center; gap: 8px; }
.brand-dot {
	width: 8px; height: 8px; border-radius: 50%;
	background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover));
	box-shadow: 0 0 6px var(--mn-accent);
	flex-shrink: 0;
}
.brand { font-size: 1rem; font-weight: 700; color: var(--mn-text); letter-spacing: -0.02em; }
.sidebar-header-right { display: flex; align-items: center; gap: 6px; }
.btn-new {
	padding: 5px 12px !important; font-size: 0.75rem !important;
	border-radius: 20px !important;
}

.sidebar-list { flex: 1; overflow-y: auto; padding: 8px 8px 16px; }
.list-section { margin-bottom: 4px; }
.list-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--mn-text-subtle); padding: 10px 10px 4px; }
.conv-item {
	width: 100%; text-align: left; padding: 9px 10px;
	border-radius: var(--mn-radius-xs); border: none;
	background: transparent; color: var(--mn-text-muted);
	cursor: pointer; transition: all var(--mn-transition); display: block; margin-bottom: 1px;
}
.conv-item:hover { background: var(--mn-accent-soft); color: var(--mn-text); }
.conv-item.active { background: var(--mn-accent-soft); color: var(--mn-accent); }
.conv-item.closed { opacity: 0.6; }
.conv-title { display: block; font-size: 0.82rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-meta { display: block; font-size: 0.68rem; color: var(--mn-text-subtle); margin-top: 1px; }
.pill-closed { display: inline-block; font-size: 0.6rem; font-weight: 600; text-transform: uppercase; padding: 1px 6px; border-radius: 20px; background: var(--mn-surface-2); color: var(--mn-text-subtle); margin-top: 2px; }
.empty-hint { font-size: 0.8rem; color: var(--mn-text-subtle); text-align: center; padding: 32px 12px; line-height: 1.7; }

/* ── Main ── */
.main {
	flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden;
	background: var(--mn-surface);
}
@media (min-width: 641px) {
	.main {
		border-radius: var(--mn-radius);
		border: 1px solid var(--mn-border-soft);
		box-shadow: var(--mn-shadow);
	}
}

/* ── Navbar ── */
.navbar {
	display: flex; align-items: center; justify-content: space-between;
	padding: 0 24px; height: 64px;
	background: var(--mn-surface);
	border-bottom: 1px solid rgba(168, 200, 228, 0.25);
	flex-shrink: 0; gap: 10px;
}
.navbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
.navbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.navbar-brand-area { display: flex; align-items: center; gap: 8px; }
.navbar-brand { font-size: 1rem; font-weight: 700; color: var(--mn-text); letter-spacing: -0.02em; }
.navbar-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.navbar-conv-title { font-size: 0.88rem; font-weight: 600; color: var(--mn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px; }
@media (max-width: 480px) { .navbar-conv-title { max-width: 160px; } }

/* ── Pills / Badges ── */
.pill { display: inline-block; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; }
.pill-active { background: rgba(34,197,94,0.15); color: #16a34a; }
.pill-closed-badge { background: var(--mn-surface-2); color: var(--mn-text-subtle); }
:global([data-theme='dark']) .pill-active { background: rgba(134,239,172,0.12); color: #86efac; }

/* ── Icon buttons ── */
.icon-btn {
	width: 34px; height: 34px; border-radius: 50%;
	border: 1px solid var(--mn-border-soft);
	background: var(--mn-surface-2); color: var(--mn-text-muted);
	display: flex; align-items: center; justify-content: center;
	transition: all var(--mn-transition); flex-shrink: 0;
}
.icon-btn:hover { background: var(--mn-accent-soft); color: var(--mn-accent); border-color: var(--mn-accent); }

/* ── End button ── */
.btn-end {
	font-size: 0.75rem; font-weight: 600; padding: 5px 12px;
	border-radius: 20px; border: 1px solid rgba(239,68,68,0.4);
	background: rgba(239,68,68,0.08); color: #ef4444;
	cursor: pointer; transition: all var(--mn-transition);
	font-family: inherit;
}
.btn-end:hover { background: rgba(239,68,68,0.15); border-color: #ef4444; }

/* ── Messages ── */
.messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 480px) { .messages { padding: 14px 12px; } }
.messages-empty { margin: auto; text-align: center; color: var(--mn-text-subtle); }
.messages-empty-icon { font-size: 2rem; margin-bottom: 8px; opacity: 0.5; }
.messages-empty p { font-size: 0.85rem; }
.msg-row { display: flex; }
.msg-right { justify-content: flex-end; }
.msg-left { justify-content: flex-start; }
.bubble { max-width: 70%; padding: 10px 14px; border-radius: var(--mn-radius-sm); font-size: 0.875rem; line-height: 1.55; }
@media (max-width: 480px) { .bubble { max-width: 88%; } }
.bubble-user {
	background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover));
	color: #fff; border-bottom-right-radius: 4px;
	box-shadow: 0 2px 8px rgba(45,124,196,0.3);
}
.bubble-admin {
	background: var(--mn-surface); color: var(--mn-text);
	border: 1px solid var(--mn-border-soft); border-bottom-left-radius: 4px;
	box-shadow: var(--mn-shadow-sm);
}
.bubble-label { font-size: 0.67rem; font-weight: 700; color: var(--mn-accent); margin-bottom: 4px; letter-spacing: 0.02em; }
.bubble-text { white-space: pre-wrap; word-break: break-word; }
.bubble-time { font-size: 0.65rem; margin-top: 5px; text-align: right; opacity: 0.55; }

/* ── Input ── */
.input-area {
	padding: 12px 20px 16px;
	background: transparent;
	flex-shrink: 0;
	display: flex;
	gap: 8px;
	align-items: center;
}

@media (max-width: 480px) {
	.input-area {
		padding: 10px 14px 14px;
		gap: 6px;
	}
}

.input-row {
	flex: 1;
	min-width: 0;
	display: flex;
	gap: 12px;
	align-items: center;

	background: var(--mn-bg);
	border: 1.5px solid var(--mn-border-soft);
	border-radius: var(--mn-radius);
	padding: 10px 14px;

	box-shadow: var(--mn-shadow);
	transition:
		border-color var(--mn-transition),
		box-shadow var(--mn-transition);
}

.input-row:focus-within {
	border-color: var(--mn-accent);
	box-shadow:
		var(--mn-shadow),
		0 0 0 3px var(--mn-accent-soft);
}

.chat-input {
	flex: 1;
	min-width: 0;
	resize: none;

	border: none;
	background: transparent;
	color: var(--mn-text);
	font-family: inherit;
	font-size: 0.9rem;
	line-height: 1.5;

	padding: 0;
	outline: none;

	min-height: 44px;
	max-height: 140px;

	display: flex;
	align-items: center;
}

.chat-input:focus {
	box-shadow: none;
	border-color: transparent;
}

.chat-input::placeholder {
	color: var(--mn-text-subtle);
}

.chat-input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.send-btn {
	width: 44px;
	height: 44px;
	flex-shrink: 0;

	border-radius: 50%;
	border: none;

	background: transparent;
	color: var(--mn-accent);

	display: flex;
	align-items: center;
	justify-content: center;

	cursor: pointer;
	transition: all var(--mn-transition);
}

.send-btn:hover:not(:disabled) {
	background: var(--mn-accent-soft);
	color: var(--mn-accent-hover);
}

.send-btn:disabled {
	opacity: 0.35;
	cursor: not-allowed;
	transform: none;
	color: var(--mn-text-subtle);
}

/* ── Empty state ── */
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 32px; gap: 12px; position: relative; overflow: hidden; }
.empty-glow { position: absolute; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, var(--mn-accent-soft) 0%, transparent 70%); pointer-events: none; }
.empty-icon { font-size: 2.8rem; position: relative; }
.empty-state h2 { font-size: 1.2rem; color: var(--mn-text); position: relative; }
.empty-state p { font-size: 0.85rem; color: var(--mn-text-muted); max-width: 260px; position: relative; }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; border-radius: var(--mn-radius-sm); font-family: inherit; font-size: 0.82rem; font-weight: 500; padding: 8px 18px; cursor: pointer; transition: all var(--mn-transition); white-space: nowrap; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary { background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover)); color: #fff; box-shadow: 0 2px 8px rgba(45,124,196,0.3); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(45,124,196,0.4); }
.btn-ghost { background: var(--mn-surface-2); color: var(--mn-text-muted); border: 1px solid var(--mn-border); }
.btn-ghost:hover { background: var(--mn-border); color: var(--mn-text); }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }

/* ── Modal ── */
.modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
.modal-box { background: var(--mn-surface); border: 1px solid var(--mn-border); border-radius: var(--mn-radius); padding: 28px 24px; max-width: 340px; width: 90%; text-align: center; box-shadow: var(--mn-shadow-lg); }
.modal-icon { font-size: 2rem; margin-bottom: 12px; }
.modal-box h3 { font-size: 1rem; color: var(--mn-text); margin-bottom: 8px; }
.modal-box p { font-size: 0.82rem; color: var(--mn-text-muted); margin-bottom: 20px; line-height: 1.6; }
.modal-actions { display: flex; gap: 10px; justify-content: center; }
</style>
