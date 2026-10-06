<script lang="ts">
  import type { Snippet } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'

  let {
    open = $bindable(false),
    title,
    busy = false,
    children,
  }: { open?: boolean; title: string; busy?: boolean; children: Snippet } = $props()

  function close() {
    if (!busy) open = false
  }
</script>

{#if open}
  <div class="backdrop" transition:fade={{ duration: 200 }} onclick={close} aria-hidden="true"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={title} transition:fly={{ y: 500, duration: 320, easing: cubicOut }}>
    <header>
      <h2>{title}</h2>
      <button class="cancel" onclick={close} disabled={busy}>Cancel</button>
    </header>
    <div class="body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(28, 27, 25, 0.28);
  }
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 41;
    max-height: calc(100dvh - var(--safe-top) - 24px);
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border-radius: 22px 22px 0 0;
    box-shadow: 0 -10px 40px rgba(28, 27, 25, 0.12);
    max-width: 640px;
    margin: 0 auto;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px var(--gutter) 14px;
    border-bottom: 1px solid var(--line);
  }
  h2 {
    font-size: 22px;
  }
  .cancel {
    color: var(--muted);
    font-size: 15px;
  }
  .body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 20px var(--gutter) calc(var(--safe-bottom) + 24px);
  }
</style>
