<script>
	import ThemeToggle from './ThemeToggle.svelte';

	/**
	 * @type {{
	 *   title?: string,
	 *   brand?: string,
	 *   status?: string,
	 *   onOpenDrawer: () => void,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let { title = '', brand = 'Ask', status = '', onOpenDrawer, children } = $props();
</script>

<header class="navbar">
	<div class="navbar-left">
		<button class="icon-btn hamburger" onclick={onOpenDrawer} aria-label="Open menu">
			<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<line x1="3" y1="6" x2="21" y2="6"/>
				<line x1="3" y1="12" x2="21" y2="12"/>
				<line x1="3" y1="18" x2="21" y2="18"/>
			</svg>
		</button>
		{#if title}
			<div class="navbar-title">
				<span class="navbar-conv-title">{title}</span>
				{#if status}
					<span class="pill {status === 'active' ? 'pill-active' : 'pill-closed-badge'}">{status}</span>
				{/if}
			</div>
		{:else}
			<div class="navbar-brand-area">
				<span class="brand-dot"></span>
				<span class="navbar-brand">{brand}</span>
			</div>
		{/if}
	</div>
	<div class="navbar-right">
		{@render children?.()}
		<ThemeToggle />
	</div>
</header>

<style>
	.navbar {
		display: flex; align-items: center; justify-content: space-between;
		padding: 0 24px; height: 64px;
		background: var(--mn-surface);
		border-bottom: 1px solid rgba(168, 200, 228, 0.25);
		flex-shrink: 0; gap: 10px;
	}
	.navbar-left  { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
	.navbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

	.icon-btn {
		width: 34px; height: 34px; border-radius: 50%;
		border: 1px solid var(--mn-border-soft);
		background: var(--mn-surface-2); color: var(--mn-text-muted);
		display: flex; align-items: center; justify-content: center;
		transition: all var(--mn-transition); flex-shrink: 0; cursor: pointer;
	}
	.icon-btn:hover { background: var(--mn-accent-soft); color: var(--mn-accent); border-color: var(--mn-accent); }

	/* hamburger only on mobile */
	.hamburger { display: none !important; }
	@media (max-width: 640px) { .hamburger { display: flex !important; } }

	.navbar-brand-area { display: flex; align-items: center; gap: 8px; }
	.brand-dot {
		width: 8px; height: 8px; border-radius: 50%;
		background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover));
		box-shadow: 0 0 6px var(--mn-accent); flex-shrink: 0;
	}
	.navbar-brand { font-size: 1rem; font-weight: 700; color: var(--mn-text); letter-spacing: -0.02em; }

	.navbar-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
	.navbar-conv-title {
		font-size: 0.88rem; font-weight: 600; color: var(--mn-text);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px;
	}
	@media (max-width: 480px) { .navbar-conv-title { max-width: 160px; } }

	.pill { display: inline-block; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; }
	.pill-active { background: rgba(34,197,94,0.15); color: #16a34a; }
	.pill-closed-badge { background: var(--mn-surface-2); color: var(--mn-text-subtle); }
	:global([data-theme='dark']) .pill-active { background: rgba(134,239,172,0.12); color: #86efac; }
</style>
