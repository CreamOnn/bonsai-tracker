<script lang="ts">
  // Twelve toggle chips, stored as "9,10,11,12,1,2,3,4". None selected = all year.
  import { monthsSet } from './due'

  let { value = $bindable('') }: { value?: string } = $props()

  const LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  // Southern-hemisphere growing season reads naturally starting in July.
  const ORDER = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]

  let set = $derived(monthsSet(value))

  function toggle(m: number) {
    const next = new Set(set)
    if (next.has(m)) next.delete(m)
    else next.add(m)
    value = ORDER.filter((x) => next.has(x)).join(',')
  }
</script>

<div class="months" role="group" aria-label="Active months">
  {#each ORDER as m (m)}
    <button class:on={set.has(m)} onclick={() => toggle(m)} aria-pressed={set.has(m)} aria-label={NAMES[m - 1]}>{LETTERS[m - 1]}</button>
  {/each}
</div>

<style>
  .months {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 4px;
  }
  button {
    height: 36px;
    border-radius: 8px;
    border: 1px solid var(--line);
    font-size: 13px;
    color: var(--muted);
  }
  button.on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--bg);
  }
</style>
