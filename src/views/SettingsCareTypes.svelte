<script lang="ts">
  // Settings → Care types: toggle scheduling and product tracking; add custom types.
  // Names can't be changed, because existing care entries refer to them by name.
  import BottomSheet from '../lib/BottomSheet.svelte'
  import Icon from '../lib/Icon.svelte'
  import { go } from '../lib/router.svelte'
  import { db, isSchedulable, saveCareType, usesProduct, type Row } from '../lib/store.svelte'

  let open = $state(false)
  let busy = $state(false)
  let error = $state('')
  let editing = $state<Row | null>(null)
  let name = $state('')
  let schedulable = $state(false)
  let product = $state(false)

  function edit(ct: Row | null) {
    editing = ct
    name = ct?.name ?? ''
    schedulable = ct ? isSchedulable(ct) : false
    product = ct ? usesProduct(ct) : false
    error = ''
    open = true
  }

  async function save() {
    busy = true
    error = ''
    try {
      await saveCareType({ name, schedulable, usesProduct: product }, editing?.name)
      open = false
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

<button class="back" onclick={() => go('settings')}><Icon name="back" size={18} /> Settings</button>
<h1>Care types</h1>

<ul>
  {#each db.careTypes as ct (ct.name)}
    <li>
      <button class="row" onclick={() => edit(ct)}>
        <span class="name">{ct.name}{#if ct.built_in !== 'y'}<span class="custom"> · custom</span>{/if}</span>
        <span class="tags">
          {#if isSchedulable(ct)}<span>Scheduled</span>{/if}
          {#if usesProduct(ct)}<span>Product</span>{/if}
        </span>
      </button>
    </li>
  {/each}
</ul>

<button class="btn ghost add" onclick={() => edit(null)}>＋ New care type</button>

<BottomSheet bind:open title={editing ? editing.name : 'New care type'} {busy}>
  {#if !editing}
    <label class="field">
      <span class="label">Name</span>
      <input bind:value={name} placeholder="e.g. Root prune" />
    </label>
  {/if}
  <label class="toggle">
    <input type="checkbox" bind:checked={schedulable} />
    <span>Can be scheduled <span class="muted">· shows in Schedules and "due"</span></span>
  </label>
  <label class="toggle">
    <input type="checkbox" bind:checked={product} />
    <span>Record product + amount</span>
  </label>
  <div class="form-actions">
    {#if error}<p class="form-error">{error}</p>{/if}
    <button class="btn" onclick={save} disabled={busy || !name.trim()}>{busy ? 'Saving…' : editing ? 'Save' : 'Add care type'}</button>
  </div>
</BottomSheet>

<style>
  h1 {
    font-size: 40px;
    margin-bottom: 18px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-height: 54px;
    border-bottom: 1px solid var(--line);
    text-align: left;
  }
  .name {
    font-size: 16px;
  }
  .custom {
    font-size: 12px;
    color: var(--muted);
  }
  .tags {
    display: flex;
    gap: 6px;
  }
  .tags span {
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-size: 11px;
    color: var(--ink-soft);
  }
  .add {
    width: 100%;
    margin-top: 24px;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 18px;
    font-size: 15px;
  }
  .toggle input {
    width: 22px;
    height: 22px;
    padding: 0;
    flex: none;
    border-radius: 6px;
  }
  .toggle input:checked {
    background: var(--ink)
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='10' fill='none' stroke='%23f6f3ee' stroke-width='2'%3E%3Cpath d='M1 5l3.5 3.5L11 1.5'/%3E%3C/svg%3E")
      no-repeat center;
    border-color: var(--ink);
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
  }
</style>
