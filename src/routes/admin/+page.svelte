<script>
	import { onMount, getContext } from 'svelte';
	const theme = getContext('theme');
	let isDark = $derived(theme.isDark);
	const toggleDark = theme.toggleDark;

	let adminSecret = $state('');
	let authenticated = $state(false);
	let authError = $state('');
	let loggingIn = $state(false);
	let conversations = $state([]);
	let closedConversations = $state([]);
	let selectedConv = $state(null);
	let convMessages = $state([]);
	let replyText = $state('');
	let loading = $state(false);
	let sending = $state(false);
	let activeTab = $state('active');
	let drawerOpen = $state(false);
	let pollingInterval = null;
	let messagesEl = $state(null);

	function headers() { return { 'x-admin-secret': adminSecret, 'Content-Type': 'application/json' }; }

	async function login() {
		if (!adminSecret.trim() || loggingIn) return;
		authError = ''; loggingIn = true;
		try {
			const res = await fetch('/api/admin/conversations', { headers: { 'x-admin-secret': adminSecret } });
			if (res.status === 401) { authError = 'Invalid admin secret.'; return; }
			if (!res.ok) { authError = `Server error (${res.status}).`; return; }
			localStorage.setItem('ask_admin_secret', adminSecret);
			authenticated = true;
			await loadConversations();
			pollingInterval = setInterval(loadConversations, 8000);
		} catch { authError = 'Connection error. Is the server running?'; }
		finally { loggingIn = false; }
	}

	async function loadConversations() {
		try {
			const [ar, cr] = await Promise.all([
				fetch('/api/admin/conversations?status=active', { headers: headers() }),
				fetch('/api/admin/conversations?status=closed', { headers: headers() })
			]);
			if (ar.ok) conversations = (await ar.json()).conversations;
			if (cr.ok) closedConversations = (await cr.json()).conversations;
		} catch { /* ignore */ }
	}

	async function selectConversation(conv) {
		selectedConv = conv; convMessages = []; loading = true; drawerOpen = false;
		try {
			const res = await fetch(`/api/admin/conversations/${conv.id}/messages`, { headers: headers() });
			if (res.ok) convMessages = (await res.json()).messages;
		} finally { loading = false; }
	}

	async function sendReply() {
		const text = replyText.trim();
		if (!text || !selectedConv || sending) return;
		replyText = ''; sending = true;
		try {
			const res = await fetch(`/api/admin/conversations/${selectedConv.id}/messages`, {
				method: 'POST', headers: headers(), body: JSON.stringify({ content: text })
			});
			if (res.ok) { const data = await res.json(); convMessages = [...convMessages, data.message]; }
		} finally { sending = false; }
	}

	async function closeConversation(conv) {
		await fetch(`/api/admin/conversations/${conv.id}/close`, { method: 'POST', headers: headers() });
		await loadConversations();
		if (selectedConv?.id === conv.id) selectedConv = { ...selectedConv, status: 'closed' };
	}

	function handleKeydown(e) { /* Enter = new line, send via button only */ }

	function signOut() {
		authenticated = false; adminSecret = '';
		clearInterval(pollingInterval);
		localStorage.removeItem('ask_admin_secret');
	}

	function fmt(iso) { return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }); }

	$effect(() => {
		if (messagesEl && convMessages.length)
			setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 50);
	});

	onMount(() => {
		const saved = localStorage.getItem('ask_admin_secret');
		if (saved) { adminSecret = saved; login(); }
		return () => clearInterval(pollingInterval);
	});

	let displayList = $derived(activeTab === 'active' ? conversations : closedConversations);
</script>

<svelte:head><title>Admin — Ask</title></svelte:head>

{#if !authenticated}
<div class="login-wrap">
	<div class="login-card">
		<button class="icon-btn theme-btn" onclick={toggleDark} aria-label="Toggle theme">
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
		<div class="login-logo">🔐</div>
		<h1>Admin Panel</h1>
		<p>Enter your admin secret to continue.</p>
		<div class="login-form">
			<input type="password" bind:value={adminSecret} placeholder="Admin secret"
				onkeydown={(e) => e.key === 'Enter' && login()} class="field" autocomplete="current-password"/>
			{#if authError}<div class="error-msg">{authError}</div>{/if}
			<button type="button" onclick={login} disabled={loggingIn || !adminSecret.trim()} class="btn btn-primary btn-full">
				{loggingIn ? 'Signing in…' : 'Sign in'}
			</button>
		</div>
	</div>
</div>
{:else}
{#if drawerOpen}
<div class="drawer-overlay" onclick={() => (drawerOpen = false)} role="presentation"></div>
{/if}

<div class="layout">
	<aside class="sidebar {drawerOpen ? 'drawer-open' : ''}">
		<div class="sidebar-header">
			<div class="sidebar-brand">
				<span class="brand-dot"></span>
				<span class="brand">Admin</span>
			</div>
			<div class="sidebar-header-right">
				<button class="sign-out" onclick={signOut}>Sign out</button>
				<button class="icon-btn drawer-close" onclick={() => (drawerOpen = false)} aria-label="Close">
					<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
		</div>

		<div class="tab-bar">
			<button class="tab {activeTab === 'active' ? 'tab-active' : ''}" onclick={() => (activeTab = 'active')}>
				Active <span class="tab-count">{conversations.length}</span>
			</button>
			<button class="tab {activeTab === 'closed' ? 'tab-active' : ''}" onclick={() => (activeTab = 'closed')}>
				Closed <span class="tab-count">{closedConversations.length}</span>
			</button>
		</div>

		<div class="sidebar-list">
			{#each displayList as conv (conv.id)}
				<button class="conv-item {selectedConv?.id === conv.id ? 'active' : ''} {conv.status === 'closed' ? 'closed' : ''}"
					onclick={() => selectConversation(conv)}>
					<span class="conv-title">{conv.title}</span>
					<span class="conv-meta">{fmt(conv.createdAt)}</span>
				</button>
			{:else}
				<p class="empty-hint">{activeTab === 'active' ? 'No active conversations.' : 'No closed conversations.'}</p>
			{/each}
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
				{#if selectedConv}
					<div class="navbar-title">
						<span class="navbar-conv-title">{selectedConv.title}</span>
						<span class="pill {selectedConv.status === 'active' ? 'pill-active' : 'pill-closed-badge'}">{selectedConv.status}</span>
					</div>
				{:else}
					<div class="navbar-brand-area">
						<span class="brand-dot"></span>
						<span class="navbar-brand">Admin Panel</span>
					</div>
				{/if}
			</div>
			<div class="navbar-right">
				{#if selectedConv?.status === 'active'}
					<button class="btn-end" onclick={() => closeConversation(selectedConv)}>Close</button>
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

		{#if selectedConv}
			<div class="messages" bind:this={messagesEl}>
				{#if loading}
					<div class="messages-empty"><p>Loading…</p></div>
				{:else if convMessages.length === 0}
					<div class="messages-empty"><p>No messages yet.</p></div>
				{/if}
				{#each convMessages as msg (msg.id)}
					<div class="msg-row {msg.role === 'admin' ? 'msg-right' : 'msg-left'}">
						<div class="bubble {msg.role === 'admin' ? 'bubble-admin-sent' : 'bubble-user'}">
							<div class="bubble-label">{msg.role === 'admin' ? 'haotian' : 'User'}</div>
							<p class="bubble-text">{msg.content}</p>
							<div class="bubble-time">{fmt(msg.createdAt)}</div>
						</div>
					</div>
				{/each}
			</div>

			{#if selectedConv.status === 'active'}
				<div class="input-area">
					<div class="input-row">
						<textarea bind:value={replyText}
							placeholder="Reply to this conversation…" disabled={sending} rows="3" class="chat-input"></textarea>
					</div>
					<button class="send-btn" onclick={sendReply} disabled={sending || !replyText.trim()} aria-label="Send reply">
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
				<div class="empty-icon">📋</div>
				<h2>Select a conversation</h2>
				<p>Choose one from the sidebar to view messages and reply.</p>
			</div>
		{/if}
	</main>
</div>
{/if}

<style>
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Login ── */
.login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.login-card {
	background: var(--mn-surface); border: 1px solid var(--mn-border);
	border-radius: var(--mn-radius); padding: 36px 32px 28px;
	width: 100%; max-width: 360px;
	box-shadow: var(--mn-shadow-lg); text-align: center; position: relative;
}
.theme-btn { position: absolute; top: 14px; right: 14px; }
.login-logo { font-size: 2rem; margin-bottom: 12px; }
.login-card h1 { font-size: 1.2rem; color: var(--mn-text); margin-bottom: 6px; }
.login-card p { font-size: 0.82rem; color: var(--mn-text-muted); margin-bottom: 24px; }
.login-form { display: flex; flex-direction: column; gap: 12px; text-align: left; }
.field {
	width: 100%; border-radius: var(--mn-radius-sm); border: 1.5px solid var(--mn-border);
	background: var(--mn-bg); color: var(--mn-text); font-family: inherit;
	font-size: 0.875rem; padding: 10px 12px; outline: none;
	transition: border-color var(--mn-transition), box-shadow var(--mn-transition);
}
.field:focus { border-color: var(--mn-accent); box-shadow: 0 0 0 3px var(--mn-accent-soft); }
.error-msg { font-size: 0.78rem; color: #ef4444; padding: 8px 10px; background: rgba(239,68,68,0.08); border-radius: var(--mn-radius-xs); border: 1px solid rgba(239,68,68,0.25); }

/* ── Layout ── */
.layout { display: flex; height: 100vh; overflow: hidden; background: var(--mn-bg); }
@media (min-width: 641px) {
	.layout { padding: 16px; gap: 16px; }
}

/* ── Sidebar ── */
.sidebar {
	width: 272px; flex-shrink: 0;
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
.brand-dot { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover)); box-shadow: 0 0 6px var(--mn-accent); flex-shrink: 0; }
.brand { font-size: 1rem; font-weight: 700; color: var(--mn-text); letter-spacing: -0.02em; }
.sidebar-header-right { display: flex; align-items: center; gap: 6px; }
.sign-out { font-size: 0.7rem; color: var(--mn-text-subtle); background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: var(--mn-radius-xs); transition: all var(--mn-transition); }
.sign-out:hover { color: #ef4444; background: rgba(239,68,68,0.08); }

/* ── Tabs ── */
.tab-bar {
	display: flex;
	background: var(--mn-bg);
	padding: 4px;
	margin: 12px 12px 4px 12px;
	border-radius: var(--mn-radius-xs);
	border: 1px solid var(--mn-border-soft);
}
.tab {
	flex: 1; padding: 8px; font-size: 0.78rem; font-weight: 600;
	color: var(--mn-text-muted); background: none; border: none;
	border-radius: calc(var(--mn-radius-xs) - 2px);
	cursor: pointer; transition: all var(--mn-transition);
	display: flex; align-items: center; justify-content: center; gap: 6px;
}
.tab:hover { color: var(--mn-text); }
.tab-active {
	color: var(--mn-text);
	background: var(--mn-surface);
	box-shadow: var(--mn-shadow-sm);
}
.tab-count { background: var(--mn-surface-2); color: var(--mn-text-subtle); font-size: 0.65rem; padding: 1px 6px; border-radius: 20px; }
.tab-active .tab-count { background: var(--mn-accent-soft); color: var(--mn-accent); }

.sidebar-list { flex: 1; overflow-y: auto; padding: 8px; }
.conv-item { width: 100%; text-align: left; padding: 9px 10px; border-radius: var(--mn-radius-xs); border: none; background: transparent; color: var(--mn-text-muted); cursor: pointer; transition: all var(--mn-transition); display: block; margin-bottom: 1px; }
.conv-item:hover { background: var(--mn-accent-soft); color: var(--mn-text); }
.conv-item.active { background: var(--mn-accent-soft); color: var(--mn-accent); }
.conv-item.closed { opacity: 0.6; }
.conv-title { display: block; font-size: 0.82rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-meta { display: block; font-size: 0.68rem; color: var(--mn-text-subtle); margin-top: 2px; }
.empty-hint { font-size: 0.8rem; color: var(--mn-text-subtle); text-align: center; padding: 32px 12px; }

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
.navbar-brand { font-size: 0.95rem; font-weight: 700; color: var(--mn-text); }
.navbar-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.navbar-conv-title { font-size: 0.88rem; font-weight: 600; color: var(--mn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 360px; }
@media (max-width: 480px) { .navbar-conv-title { max-width: 150px; } }

/* ── Pills ── */
.pill { display: inline-block; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; }
.pill-active { background: rgba(34,197,94,0.15); color: #16a34a; }
.pill-closed-badge { background: var(--mn-surface-2); color: var(--mn-text-subtle); }
:global([data-theme='dark']) .pill-active { background: rgba(134,239,172,0.12); color: #86efac; }

/* ── Icon buttons ── */
.icon-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--mn-border-soft); background: var(--mn-surface-2); color: var(--mn-text-muted); display: flex; align-items: center; justify-content: center; transition: all var(--mn-transition); flex-shrink: 0; }
.icon-btn:hover { background: var(--mn-accent-soft); color: var(--mn-accent); border-color: var(--mn-accent); }

/* ── Close/End button ── */
.btn-end { font-size: 0.75rem; font-weight: 600; padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); color: #ef4444; cursor: pointer; transition: all var(--mn-transition); font-family: inherit; }
.btn-end:hover { background: rgba(239,68,68,0.15); border-color: #ef4444; }

/* ── Messages ── */
.messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 480px) { .messages { padding: 14px 12px; } }
.messages-empty { margin: auto; text-align: center; color: var(--mn-text-subtle); font-size: 0.85rem; }
.msg-row { display: flex; }
.msg-right { justify-content: flex-end; }
.msg-left { justify-content: flex-start; }
.bubble { max-width: 70%; padding: 10px 14px; border-radius: var(--mn-radius-sm); font-size: 0.875rem; line-height: 1.55; }
@media (max-width: 480px) { .bubble { max-width: 88%; } }
.bubble-user { background: var(--mn-surface); color: var(--mn-text); border: 1px solid var(--mn-border-soft); border-bottom-left-radius: 4px; box-shadow: var(--mn-shadow-sm); }
.bubble-admin-sent { background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover)); color: #fff; border-bottom-right-radius: 4px; box-shadow: 0 2px 8px rgba(45,124,196,0.3); }
.bubble-label { font-size: 0.67rem; font-weight: 700; margin-bottom: 4px; color: var(--mn-text-subtle); letter-spacing: 0.02em; }
.bubble-admin-sent .bubble-label { color: rgba(255,255,255,0.7); }
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
.empty-state h2 { font-size: 1.1rem; color: var(--mn-text); position: relative; }
.empty-state p { font-size: 0.82rem; color: var(--mn-text-muted); max-width: 260px; position: relative; }

/* ── Buttons ── */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; border-radius: var(--mn-radius-sm); font-family: inherit; font-size: 0.82rem; font-weight: 500; padding: 8px 18px; cursor: pointer; transition: all var(--mn-transition); white-space: nowrap; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary { background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover)); color: #fff; box-shadow: 0 2px 8px rgba(45,124,196,0.3); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(45,124,196,0.4); }
.btn-full { width: 100%; }
</style>
