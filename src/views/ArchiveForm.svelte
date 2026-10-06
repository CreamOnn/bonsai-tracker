<script lang="ts">
  import { cleanNumber, todayISO } from '../lib/format'
  import { archiveRecord, type ArchiveStatus, type Kind } from '../lib/store.svelte'

  let { kind, id, ondone, busy = $bindable(false) }: { kind: Kind; id: string; ondone: () => void; busy?: boolean } = $props()

  let options = $derived<{ value: ArchiveStatus; label: string }[]>([
    { value: 'sold', label: 'Sold' },
    { value: 'gifted', label: 'Gifted' },
    // A pot can't die, but it can break.
    { value: 'died', label: kind === 'pot' ? 'Broken' : 'Died' },
  ])
  let status = $state<ArchiveStatus>('sold')
  let date = $state(todayISO())
  let salePrice = $state('')
  let error = $state('')

  async function save() {
    busy = true
    error = ''
    try {
      await archiveRecord(kind, id, status, date, cleanNumber(salePrice))
      ondone()
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

<p class="intro">Archived {kind}s keep their photos and history, and move to the end of the grid.</p>

<div class="seg" role="radiogroup" aria-label="Reason">
  {#each options as o (o.value)}
    <button role="radio" aria-checked={status === o.value} class:on={status === o.value} onclick={() => (status = o.value)}>{o.label}</button>
  {/each}
</div>

<div class={status === 'sold' ? 'row2' : ''}>
  <label class="field">
    <span class="label">Date</span>
    <input type="date" bind:value={date} max={todayISO()} />
  </label>
  {#if status === 'sold'}
    <label class="field">
      <span class="label">Sale price · optional</span>
      <input bind:value={salePrice} inputmode="decimal" placeholder="$0" />
    </label>
  {/if}
</div>

<div class="form-actions">
  {#if error}<p class="form-error">{error}</p>{/if}
  <button class="btn" onclick={save} disabled={busy || !date}>{busy ? 'Saving…' : `Archive ${kind}`}</button>
</div>

<style>
  .intro {
    margin: 0 0 20px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
  }
  .seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: var(--line);
    margin-bottom: 22px;
  }
  .seg button {
    height: 40px;
    border-radius: 10px;
    font-size: 15px;
    color: var(--ink-soft);
    transition: background 0.15s ease;
  }
  .seg button.on {
    background: var(--surface);
    color: var(--ink);
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(28, 27, 25, 0.08);
  }
</style>
