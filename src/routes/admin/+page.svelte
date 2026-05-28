<script>
	import { onMount, getContext } from 'svelte';
	import Footer from '$lib/components/Footer.svelte';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import AppNavbar from '$lib/components/AppNavbar.svelte';
	import MessageList from '$lib/components/MessageList.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	const theme = getContext('theme');

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
		<div class="login-card-top">
			<ThemeToggle />
		</div>
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

<div class="layout">
	<AppSidebar bind:open={drawerOpen} onClose={() => (drawerOpen = false)} brand="Admin">
		{#snippet actions()}
			<button class="sign-out" onclick={signOut}>Sign out</button>
		{/snippet}

		<div class="tab-bar">
			<button class="tab {activeTab === 'active' ? 'tab-active' : ''}" onclick={() => (activeTab = 'active')}>
				Active <span class="tab-count">{conversations.length}</span>
			</button>
			<button class="tab {activeTab === 'closed' ? 'tab-active' : ''}" onclick={() => (activeTab = 'closed')}>
				Closed <span class="tab-count">{closedConversations.length}</span>
			</button>
		</div>

		{#each displayList as conv (conv.id)}
			<button class="conv-item {selectedConv?.id === conv.id ? 'active' : ''} {conv.status === 'closed' ? 'closed' : ''}"
				onclick={() => selectConversation(conv)}>
				<span class="conv-title">{conv.title}</span>
				<span class="conv-meta">{fmt(conv.createdAt)}</span>
			</button>
		{:else}
			<p class="empty-hint">{activeTab === 'active' ? 'No active conversations.' : 'No closed conversations.'}</p>
		{/each}
	</AppSidebar>

	<main class="main">
		<AppNavbar
			title={selectedConv?.title ?? ''}
			brand="Admin Panel"
			status={selectedConv?.status ?? ''}
			onOpenDrawer={() => (drawerOpen = true)}
		>
			{#snippet children()}
				{#if selectedConv?.status === 'active'}
					<button class="btn-end" onclick={() => closeConversation(selectedConv)}>Close</button>
				{/if}
			{/snippet}
		</AppNavbar>

		{#if selectedConv}
			{#if loading}
				<div class="messages-loading"><p>Loading…</p></div>
			{:else}
				<MessageList
					messages={convMessages}
					perspective="admin"
					{fmt}
					bind:bindEl={messagesEl}
				/>
			{/if}

			{#if selectedConv.status === 'active'}
				<ChatInput bind:value={replyText} placeholder="Reply to this conversation…" {sending} onsend={sendReply} />
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

<Footer />

<style>
/* ── Login ── */
.login-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; overflow-y: auto; }
.login-card {
	background: var(--mn-surface); border: 1px solid var(--mn-border);
	border-radius: var(--mn-radius); padding: 36px 32px 28px;
	width: 100%; max-width: 360px;
	box-shadow: var(--mn-shadow-lg); text-align: center;
}
.login-card-top { display: flex; justify-content: flex-end; margin-bottom: 8px; }
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
.layout { display: flex; flex: 1; min-height: 0; overflow: hidden; background: var(--mn-bg); }
@media (min-width: 641px) { .layout { padding: 16px; gap: 16px; } }

/* ── Main ── */
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; background: var(--mn-surface); }
@media (min-width: 641px) {
	.main { border-radius: var(--mn-radius); border: 1px solid var(--mn-border-soft); box-shadow: var(--mn-shadow); }
}

/* ── Sidebar content ── */
.sign-out { font-size: 0.7rem; color: var(--mn-text-subtle); background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: var(--mn-radius-xs); transition: all var(--mn-transition); }
.sign-out:hover { color: #ef4444; background: rgba(239,68,68,0.08); }

.tab-bar { display: flex; background: var(--mn-bg); padding: 4px; margin: 12px 12px 4px; border-radius: var(--mn-radius-xs); border: 1px solid var(--mn-border-soft); }
.tab { flex: 1; padding: 8px; font-size: 0.78rem; font-weight: 600; color: var(--mn-text-muted); background: none; border: none; border-radius: calc(var(--mn-radius-xs) - 2px); cursor: pointer; transition: all var(--mn-transition); display: flex; align-items: center; justify-content: center; gap: 6px; }
.tab:hover { color: var(--mn-text); }
.tab-active { color: var(--mn-text); background: var(--mn-surface); box-shadow: var(--mn-shadow-sm); }
.tab-count { background: var(--mn-surface-2); color: var(--mn-text-subtle); font-size: 0.65rem; padding: 1px 6px; border-radius: 20px; }
.tab-active .tab-count { background: var(--mn-accent-soft); color: var(--mn-accent); }

.conv-item { width: 100%; text-align: left; padding: 9px 10px; border-radius: var(--mn-radius-xs); border: none; background: transparent; color: var(--mn-text-muted); cursor: pointer; transition: all var(--mn-transition); display: block; margin-bottom: 1px; }
.conv-item:hover { background: var(--mn-accent-soft); color: var(--mn-text); }
.conv-item.active { background: var(--mn-accent-soft); color: var(--mn-accent); }
.conv-item.closed { opacity: 0.6; }
.conv-title { display: block; font-size: 0.82rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-meta { display: block; font-size: 0.68rem; color: var(--mn-text-subtle); margin-top: 2px; }
.empty-hint { font-size: 0.8rem; color: var(--mn-text-subtle); text-align: center; padding: 32px 12px; }

/* ── End/Close button ── */
.btn-end { font-size: 0.75rem; font-weight: 600; padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); color: #ef4444; cursor: pointer; transition: all var(--mn-transition); font-family: inherit; }
.btn-end:hover { background: rgba(239,68,68,0.15); border-color: #ef4444; }

/* ── Messages loading ── */
.messages-loading { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--mn-text-subtle); font-size: 0.85rem; }

/* ── Closed bar ── */
.closed-bar { padding: 12px 20px; text-align: center; font-size: 0.8rem; color: var(--mn-text-subtle); background: var(--mn-surface-2); border-top: 1px solid var(--mn-border-soft); flex-shrink: 0; }

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
