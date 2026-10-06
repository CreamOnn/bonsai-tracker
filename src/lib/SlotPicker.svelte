<script lang="ts">
  import { POT_SLOTS, type PotSlot } from './store.svelte'
  let { value = $bindable('front') }: { value?: PotSlot } = $props()
</script>

<div class="field">
  <span class="label">Slot</span>
  <div class="seg" role="radiogroup" aria-label="Photo slot">
    {#each POT_SLOTS as s (s.value)}
      <button role="radio" aria-checked={value === s.value} class:on={value === s.value} onclick={() => (value = s.value)}>{s.label}</button>
    {/each}
  </div>
</div>

<style>
  .seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: var(--line);
  }
  .seg button {
    height: 40px;
    border-radius: 10px;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .seg button.on {
    background: var(--surface);
    color: var(--ink);
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(28, 27, 25, 0.08);
  }
</style>
