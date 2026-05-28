<script>
	import '../app.css';
	import { onMount, setContext } from 'svelte';

	let { children } = $props();
	let isDark = $state(false);

	function toggleDark() {
		isDark = !isDark;
		document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
		localStorage.setItem('ask-theme', isDark ? 'dark' : 'light');
	}

	onMount(() => {
		const saved = localStorage.getItem('ask-theme');
		isDark = saved === 'dark';
		document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
	});

	// Expose to child pages via context
	setContext('theme', { get isDark() { return isDark; }, toggleDark });
</script>

{@render children()}
