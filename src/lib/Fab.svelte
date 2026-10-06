<script lang="ts">
  import { ensureFreshToken } from './auth'
  import Icon from './Icon.svelte'
  import { ui } from './store.svelte'

  let open = $state(false)
  const items: { label: string; icon: 'tree' | 'pot' | 'care'; action?: () => void }[] = [
    { label: 'Log round', icon: 'care' },
    {
      label: 'Add pot',
      icon: 'pot',
      action: () => {
        ensureFreshToken()
        ui.addPot = true
      },
    },
    {
      label: 'Add tree',
      icon: 'tree',
      action: () => {
        ensureFreshToken()
        ui.addTree = true
      },
    },
  ]

  function run(action?: () => void) {
    open = false
    action?.()
  }
</script>

{#if open}
  <button class="scrim" aria-label="Close menu" onclick={() => (open = false)}></button>
{/if}

<div class="wrap">
  {#if open}
    <ul>
      {#each items as item, i (item.label)}
        <li style="--i: {items.length - 1 - i}">
          <button disabled={!item.action} title={item.action ? undefined : 'Coming in a later build'} onclick={() => run(item.action)}>
            <span>{item.label}</span>
            <span class="ico"><Icon name={item.icon} size={20} /></span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <button class="fab" class:open aria-label={open ? 'Close menu' : 'Add'} aria-expanded={open} onclick={() => (open = !open)}>
    <Icon name="plus" size={26} />
  </button>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 25;
    background: rgba(246, 243, 238, 0.7);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .wrap {
    position: fixed;
    right: var(--gutter);
    bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 16px);
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 14px;
  }
  .fab {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: var(--ink);
    color: var(--bg);
    display: grid;
    place-items: center;
    box-shadow: 0 10px 30px rgba(28, 27, 25, 0.18);
    transition: transform 0.25s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .fab.open {
    transform: rotate(45deg);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  li {
    animation: pop 0.22s cubic-bezier(0.2, 0.7, 0.2, 1) both;
    animation-delay: calc(var(--i) * 35ms);
  }
  li button {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
    font-size: 15px;
    font-weight: 500;
  }
  li button:disabled {
    cursor: default;
    opacity: 0.4;
  }
  .ico {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid var(--line);
    display: grid;
    place-items: center;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.96);
    }
  }
</style>
