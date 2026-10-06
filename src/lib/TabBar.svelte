<script lang="ts">
  import Icon from './Icon.svelte'
  import { go, router, type Route } from './router.svelte'

  const tabs: { route: Route; label: string; icon: 'home' | 'tree' | 'pot' | 'settings' }[] = [
    { route: 'home', label: 'Home', icon: 'home' },
    { route: 'trees', label: 'Trees', icon: 'tree' },
    { route: 'pots', label: 'Pots', icon: 'pot' },
    { route: 'settings', label: 'Settings', icon: 'settings' },
  ]
  // Maker pages belong to the Pots tab.
  let current = $derived(router.route === 'makers' ? 'pots' : router.route)
</script>

<nav>
  {#each tabs as t (t.route)}
    <button class:active={current === t.route} onclick={() => go(t.route)} aria-current={current === t.route ? 'page' : undefined}>
      <Icon name={t.icon} />
      <span>{t.label}</span>
    </button>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    height: calc(var(--tabbar-h) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border-top: 1px solid var(--line);
  }
  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--muted);
    transition: color 0.2s ease;
  }
  button.active {
    color: var(--ink);
  }
  span {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.06em;
  }
</style>
