<script>
	/**
	 * @type {{ open: boolean, onClose: () => void, brand?: string, children: import('svelte').Snippet, actions?: import('svelte').Snippet }}
	 */
	let { open, onClose, brand = 'Ask', children, actions } = $props();
</script>

{#if open}
	<div class="drawer-overlay" onclick={onClose} role="presentation"></div>
{/if}

<aside class="sidebar {open ? 'drawer-open' : ''}">
	<div class="sidebar-header">
		<div class="sidebar-brand">
			<span class="brand-dot"></span>
			<span class="brand">{brand}</span>
		</div>
		<div class="sidebar-header-right">
			{@render actions?.()}
			<button class="icon-btn drawer-close" onclick={onClose} aria-label="Close">
				<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>
	</div>

	<div class="sidebar-list">
		{@render children()}
	</div>
</aside>

<style>
	.drawer-overlay {
		display: none;
	}
	@media (max-width: 640px) {
		.drawer-overlay {
			display: block; position: fixed; inset: 0; z-index: 199;
			background: rgba(0,0,0,0.45); backdrop-filter: blur(3px);
		}
	}

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
	@media (max-width: 640px) {
		.sidebar { position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%); box-shadow: var(--mn-shadow-lg); }
		.sidebar.drawer-open { transform: translateX(0); }
	}

	.sidebar-header {
		height: 64px; padding: 0 18px;
		display: flex; align-items: center; justify-content: space-between;
		border-bottom: 1px solid rgba(168, 200, 228, 0.25);
		flex-shrink: 0;
	}
	.sidebar-brand { display: flex; align-items: center; gap: 8px; }
	.brand-dot {
		width: 8px; height: 8px; border-radius: 50%;
		background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent-hover));
		box-shadow: 0 0 6px var(--mn-accent); flex-shrink: 0;
	}
	.brand { font-size: 1rem; font-weight: 700; color: var(--mn-text); letter-spacing: -0.02em; }
	.sidebar-header-right { display: flex; align-items: center; gap: 6px; }

	.icon-btn {
		width: 34px; height: 34px; border-radius: 50%;
		border: 1px solid var(--mn-border-soft);
		background: var(--mn-surface-2); color: var(--mn-text-muted);
		display: flex; align-items: center; justify-content: center;
		transition: all var(--mn-transition); flex-shrink: 0; cursor: pointer;
	}
	.icon-btn:hover { background: var(--mn-accent-soft); color: var(--mn-accent); border-color: var(--mn-accent); }

	/* drawer-close only on mobile */
	.drawer-close { display: none !important; }
	@media (max-width: 640px) { .drawer-close { display: flex !important; } }

	.sidebar-list { flex: 1; overflow-y: auto; padding: 8px 8px 16px; }
</style>
