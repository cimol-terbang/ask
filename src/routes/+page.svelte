<script>
	import { onMount, getContext } from 'svelte';
	import Footer from '$lib/components/Footer.svelte';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import AppNavbar from '$lib/components/AppNavbar.svelte';
	import MessageList from '$lib/components/MessageList.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';

	const theme = getContext('theme');

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

	let activeSession  = $derived(sessions.find((s) => s.sessionId === activeSessionId) ?? null);
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

<div class="layout">
	<AppSidebar bind:open={drawerOpen} onClose={() => (drawerOpen = false)} brand="Ask">
		{#snippet actions()}
			<button class="btn btn-primary btn-new" onclick={startNewConversation}>+ New</button>
		{/snippet}

		{#if activeSessions.length > 0}
			<div class="list-section">
				<div class="list-label">Active</div>
				{#each activeSessions as s (s.sessionId)}
					<button class="conv-item {activeSessionId === s.sessionId ? 'active' : ''}"
						onclick={() => { activeSessionId = s.sessionId; drawerOpen = false; }}>
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
					<button class="conv-item closed {activeSessionId === s.sessionId ? 'active' : ''}"
						onclick={() => { activeSessionId = s.sessionId; drawerOpen = false; }}>
						<span class="conv-title">{s.title || 'Untitled'}</span>
						<span class="pill-closed">closed</span>
					</button>
				{/each}
			</div>
		{/if}
		{#if sessions.length === 0}
			<p class="empty-hint">No conversations yet.<br/>Start by asking a question.</p>
		{/if}
	</AppSidebar>

	<main class="main">
		<AppNavbar
			title={activeSession?.title ?? ''}
			brand="Ask"
			status={activeSession?.status ?? ''}
			onOpenDrawer={() => (drawerOpen = true)}
		>
			{#snippet children()}
				{#if activeSession?.status === 'active'}
					<button class="btn-end" onclick={() => (showEndWarning = true)}>End</button>
				{/if}
			{/snippet}
		</AppNavbar>

		{#if activeSession}
			<MessageList
				messages={activeSession.messages}
				perspective="user"
				{fmt}
				bind:bindEl={messagesEl}
			/>

			{#if activeSession.status === 'active'}
				<ChatInput bind:value={inputText} placeholder="Ask something…" {sending} onsend={sendMessage} />
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

<Footer />

<style>
@keyframes spin { to { transform: rotate(360deg); } }

.layout { display: flex; flex: 1; min-height: 0; overflow: hidden; background: var(--mn-bg); }
@media (min-width: 641px) { .layout { padding: 16px; gap: 16px; } }

/* ── Main ── */
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; background: var(--mn-surface); }
@media (min-width: 641px) {
	.main { border-radius: var(--mn-radius); border: 1px solid var(--mn-border-soft); box-shadow: var(--mn-shadow); }
}

/* ── Sidebar list items ── */
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

/* ── Sidebar action button ── */
.btn-new { padding: 5px 12px !important; font-size: 0.75rem !important; border-radius: 20px !important; }

/* ── End button ── */
.btn-end { font-size: 0.75rem; font-weight: 600; padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); color: #ef4444; cursor: pointer; transition: all var(--mn-transition); font-family: inherit; }
.btn-end:hover { background: rgba(239,68,68,0.15); border-color: #ef4444; }

/* ── Closed bar ── */
.closed-bar { padding: 12px 20px; text-align: center; font-size: 0.8rem; color: var(--mn-text-subtle); background: var(--mn-surface-2); border-top: 1px solid var(--mn-border-soft); flex-shrink: 0; }

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
