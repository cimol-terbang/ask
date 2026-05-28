<script>
	import { getContext } from 'svelte';
	const theme = getContext('theme');
	let isDark = $derived(theme.isDark);
	const toggleDark = theme.toggleDark;
</script>

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

<style>
	.icon-btn {
		width: 34px; height: 34px; border-radius: 50%;
		border: 1px solid var(--mn-border-soft);
		background: var(--mn-surface-2); color: var(--mn-text-muted);
		display: flex; align-items: center; justify-content: center;
		transition: all var(--mn-transition); flex-shrink: 0;
		cursor: pointer;
	}
	.icon-btn:hover { background: var(--mn-accent-soft); color: var(--mn-accent); border-color: var(--mn-accent); }
</style>
