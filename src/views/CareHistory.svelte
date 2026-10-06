<script lang="ts">
  // The tree page's care history: newest 10, then "Show all". Tap an entry to edit or delete it.
  import BottomSheet from '../lib/BottomSheet.svelte'
  import { ensureFreshToken } from '../lib/auth'
  import { fmtDate } from '../lib/format'
  import { careFor, type Row } from '../lib/store.svelte'
  import CareEditForm from './CareEditForm.svelte'
  import CareCalendar from '../lib/CareCalendar.svelte'

  let { treeId }: { treeId: string } = $props()

  // Always opens on the list; the calendar is one tap away.
  let view = $state<'list' | 'calendar'>('list')

  const LIMIT = 10
  let all = $derived(careFor(treeId))
  let showAll = $state(false)
  let shown = $derived(showAll ? all : all.slice(0, LIMIT))

  let open = $state(false)
  let busy = $state(false)
  let editing = $state<Row | null>(null)

  function edit(c: Row) {
    ensureFreshToken()
    editing = c
    open = true
  }
</script>

<section>
  <div class="top">
    <h2 class="label">Care · {all.length}</h2>
    <div class="seg" role="tablist" aria-label="Care view">
      <button role="tab" aria-selected={view === 'list'} class:on={view === 'list'} onclick={() => (view = 'list')}>List</button>
      <button role="tab" aria-selected={view === 'calendar'} class:on={view === 'calendar'} onclick={() => (view = 'calendar')}>Calendar</button>
    </div>
  </div>
  {#if view === 'calendar'}
    <CareCalendar entries={all} onentry={edit} />
  {:else if all.length === 0}
    <p class="empty">No care logged yet.</p>
  {:else}
    <ul>
      {#each shown as c (c.id)}
        <li>
          <button onclick={() => edit(c)}>
            <span class="date">{fmtDate(c.date)}</span>
            <span class="body">
              <span class="type">{c.care_type}</span>
              {#if c.product || c.amount}<span class="meta">{[c.product, c.amount].filter(Boolean).join(' · ')}</span>{/if}
              {#if c.notes}<span class="notes">{c.notes}</span>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
    {#if all.length > LIMIT}
      <button class="more" onclick={() => (showAll = !showAll)}>{showAll ? 'Show fewer' : `Show all ${all.length}`}</button>
    {/if}
  {/if}
</section>

<BottomSheet bind:open title="Care entry" {busy}>
  {#if editing}
    {#key editing.id}
      <CareEditForm entry={editing} bind:busy ondone={() => (open = false)} />
    {/key}
  {/if}
</BottomSheet>

<style>
  section {
    margin-top: 40px;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .seg {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: 10px;
    background: var(--line);
  }
  .seg button {
    height: 28px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .seg button.on {
    background: var(--surface);
    color: var(--ink);
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(28, 27, 25, 0.08);
  }
  .empty {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 15px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li button {
    width: 100%;
    display: flex;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid var(--line);
    text-align: left;
  }
  .date {
    flex: none;
    width: 86px;
    font-size: 14px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .type {
    font-size: 16px;
  }
  .meta {
    font-size: 13px;
    color: var(--ink-soft);
  }
  .notes {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.45;
  }
  .more {
    margin-top: 14px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink-soft);
  }
</style>
