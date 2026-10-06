<script lang="ts">
  // Edits a list of seasonal windows (SPEC §6b): from/to half-months, plus optional interval and product.
  import { untrack } from 'svelte'
  import Icon from './Icon.svelte'
  import IntervalInput from './IntervalInput.svelte'
  import ListSelect from './ListSelect.svelte'
  import { HALVES, endLabel, fmtWindow, startLabel, type Window } from './windows'

  let {
    value = $bindable([]),
    withInterval = false,
    productList = '',
  }: { value?: Window[]; withInterval?: boolean; productList?: string } = $props()

  type Draft = { key: number; from: number; to: number; interval: string; product: string }
  let nextKey = 0
  let rows = $state<Draft[]>(
    untrack(() => value).map((w) => ({ key: nextKey++, from: w.from, to: w.to, interval: w.interval ? String(w.interval) : '', product: w.product })),
  )

  $effect(() => {
    value = rows.map((r) => ({ from: Number(r.from), to: Number(r.to), interval: Number(r.interval) || null, product: r.product }))
  })

  function add() {
    // Start where the last window ended, so adding a second season is one tap away from right.
    const last = rows[rows.length - 1]
    const from = last ? (last.to % 24) + 1 : 17
    rows.push({ key: nextKey++, from, to: ((from + 5) % 24) + 1, interval: '', product: '' })
  }
</script>

{#if rows.length === 0}
  <p class="empty">All year. Add a window to limit when this is due.</p>
{/if}

{#each rows as r, i (r.key)}
  <div class="win">
    <div class="head">
      <span class="label">{fmtWindow({ from: Number(r.from), to: Number(r.to) })}</span>
      <button class="rm" onclick={() => rows.splice(i, 1)} aria-label="Remove window"><Icon name="plus" size={18} /></button>
    </div>
    <div class="range">
      <select bind:value={r.from} aria-label="From">
        {#each HALVES as h (h)}<option value={h}>{startLabel(h)}</option>{/each}
      </select>
      <span>to</span>
      <select bind:value={r.to} aria-label="To">
        {#each HALVES as h (h)}<option value={h}>{endLabel(h)}</option>{/each}
      </select>
    </div>
    {#if withInterval}
      <div class="field sub">
        <span class="label">Interval in this window · optional</span>
        <IntervalInput bind:value={r.interval} placeholder="Base" />
      </div>
    {/if}
    {#if productList}
      <div class="sub"><ListSelect label="Product in this window" list={productList} bind:value={r.product} /></div>
    {/if}
  </div>
{/each}

<button class="add" onclick={add}>＋ Add window</button>

<style>
  .empty {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--muted);
  }
  .win {
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .win + .win {
    margin-top: 10px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .rm {
    color: var(--muted);
    transform: rotate(45deg);
    display: flex;
  }
  .range {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    align-items: center;
    color: var(--muted);
    font-size: 14px;
  }
  .sub {
    margin-top: 14px;
  }
  .add {
    margin-top: 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink-soft);
  }
</style>
