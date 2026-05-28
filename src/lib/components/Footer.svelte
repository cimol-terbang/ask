<footer class="site-footer">
	<div class="footer-left">
		<span class="footer-logo">
			<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect width="32" height="32" rx="8" fill="var(--mn-accent)"/>
				<path d="M24 7H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10l4 4V21h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" fill="white"/>
			</svg>
			<span class="footer-site-name">Ask</span>
		</span>
		<span class="footer-url">haotian.my.id</span>
	</div>
	<div class="footer-right">
		<span class="footer-made">Made by</span>
		<a href="https://haotian.my.id" target="_blank" rel="noopener noreferrer" class="footer-link">
			haotian.my.id
			<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
				<polyline points="15 3 21 3 21 9"/>
				<line x1="10" y1="14" x2="21" y2="3"/>
			</svg>
		</a>
	</div>
</footer>

<style>
	.site-footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 20px;
		background: var(--mn-bg);
		border-top: 1px solid var(--mn-border-soft);
		font-size: 0.72rem;
		color: var(--mn-text-subtle);
		gap: 8px;
	}

	.footer-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.footer-logo {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.footer-site-name {
		font-weight: 700;
		font-size: 0.78rem;
		color: var(--mn-text);
		letter-spacing: -0.02em;
	}

	.footer-url {
		color: var(--mn-text-subtle);
		font-size: 0.68rem;
	}

	@media (max-width: 480px) {
		.footer-url { display: none; }
	}

	.footer-right {
		display: flex;
		align-items: center;
		gap: 5px;
		flex-shrink: 0;
	}

	.footer-made {
		color: var(--mn-text-subtle);
	}

	.footer-link {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		color: var(--mn-accent);
		text-decoration: none;
		font-weight: 600;
		transition: color 0.18s ease;
	}

	.footer-link:hover {
		color: var(--mn-accent-hover);
		text-decoration: underline;
	}
</style>
