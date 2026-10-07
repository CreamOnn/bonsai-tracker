<script lang="ts">
  // Settings → Care types (SPEC §6c): rename (carries through to history), calendar code,
  // scheduling and product toggles, hide/unhide, and delete for types that were never used.
  import BottomSheet from '../lib/BottomSheet.svelte'
  import Icon from '../lib/Icon.svelte'
  import { go } from '../lib/router.svelte'
  import {
    FERTILISE,
    careCodes,
    careTypeUsage,
    db,
    deleteCareType,
    isSchedulable,
    renameCareType,
    saveCareType,
    setCareTypeHidden,
    usesProduct,
    type Row,
  } from '../lib/store.svelte'

  let open = $state(false)
  let busy = $state(false)
  let error = $state('')
  let editing = $state<Row | null>(null)
  let name = $state('')
  let schedulable = $state(false)
  let product = $state(false)
  let code = $state('')
  let confirmDelete = $state(false)

  let codes = $derived(careCodes())
  let visible = $derived(db.careTypes.filter((c) => c.hidden !== 'y'))
  let hidden = $derived(db.careTypes.filter((c) => c.hidden === 'y'))
  let usage = $derived(editing ? careTypeUsage(editing.name) : 0)
  let canRename = $derived(!editing || editing.name !== FERTILISE)

  // A code another type already uses (case-insensitive).
  let clash = $derived.by(() => {
    const c = code.trim().toLowerCase()
    if (!c) return ''
    for (const [n, v] of codes) if (n !== editing?.name && v.toLowerCase() === c) return n
    return ''
  })

  function edit(ct: Row | null) {
    editing = ct
    name = ct?.name ?? ''
    schedulable = ct ? isSchedulable(ct) : false
    product = ct ? usesProduct(ct) : false
    code = ct ? (codes.get(ct.name) ?? '') : ''
    confirmDelete = false
    error = ''
    open = true
  }

  async function run(fn: () => Promise<unknown>) {
    busy = true
    error = ''
    try {
      await fn()
      open = false
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  const save = () =>
    run(async () => {
      if (clash) return
      let current = editing?.name
      if (editing && name.trim() !== editing.name) {
        await renameCareType(editing.name, name)
        current = name.trim()
      }
      await saveCareType({ name, schedulable, usesProduct: product, code }, current)
    })

  const toggleHidden = () => run(() => setCareTypeHidden(editing!.name, editing!.hidden !== 'y'))
  const remove = () => run(() => deleteCareType(editing!.name))
</script>

{#snippet row(ct: Row)}
  <li>
    <button class="row" class:off={ct.hidden === 'y'} onclick={() => edit(ct)}>
      <span class="name"><span class="code">{codes.get(ct.name)}</span>{ct.name}{#if ct.built_in !== 'y'}<span class="custom"> · custom</span>{/if}</span>
      <span class="tags">
        {#if isSchedulable(ct)}<span>Scheduled</span>{/if}
        {#if usesProduct(ct)}<span>Product</span>{/if}
      </span>
    </button>
  </li>
{/snippet}

<button class="back" onclick={() => go('settings')}><Icon name="back" size={18} /> Settings</button>
<h1>Care types</h1>

<ul>
  {#each visible as ct (ct.name)}{@render row(ct)}{/each}
</ul>

<button class="btn ghost add" onclick={() => edit(null)}>＋ New care type</button>

{#if hidden.length}
  <h2 class="label hiddenhead">Hidden</h2>
  <p class="hiddenhelp">Not offered when logging care or in schedules. Their history stays.</p>
  <ul>
    {#each hidden as ct (ct.name)}{@render row(ct)}{/each}
  </ul>
{/if}

<BottomSheet bind:open title={editing ? editing.name : 'New care type'} {busy}>
  <label class="field">
    <span class="label">Name</span>
    <input bind:value={name} placeholder="e.g. Root prune" disabled={!canRename} />
    {#if !canRename}
      <span class="muted">Fertilise can't be renamed, because phosphorus-sensitive fertilising depends on it.</span>
    {:else if editing && name.trim() !== editing.name && usage}
      <span class="muted">Renaming also updates its {usage} past entr{usage === 1 ? 'y' : 'ies'} and schedules.</span>
    {/if}
  </label>
  <label class="field codefield">
    <span class="label">Calendar code</span>
    <input bind:value={code} maxlength="3" placeholder={editing ? '' : 'Automatic'} autocapitalize="characters" />
    {#if clash}<span class="form-error">Already used by {clash}.</span>{/if}
  </label>
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
    {#if confirmDelete}
      <p class="confirm">Delete {editing?.name}? It has never been used, so nothing else changes.</p>
      <button class="btn danger" onclick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
      <button class="btn ghost" onclick={() => (confirmDelete = false)} disabled={busy}>Keep it</button>
    {:else}
      <button class="btn" onclick={save} disabled={busy || !name.trim() || !!clash}>{busy ? 'Saving…' : editing ? 'Save' : 'Add care type'}</button>
      {#if editing}
        <button class="btn ghost" onclick={toggleHidden} disabled={busy}>{editing.hidden === 'y' ? 'Unhide' : 'Hide'}</button>
        {#if usage === 0}
          <button class="btn ghost del" onclick={() => (confirmDelete = true)} disabled={busy}>Delete</button>
        {/if}
      {/if}
    {/if}
  </div>
</BottomSheet>

<style>
  .row.off {
    opacity: 0.55;
  }
  .hiddenhead {
    margin: 36px 0 4px;
  }
  .hiddenhelp {
    margin: 0 0 6px;
    font-size: 13px;
    color: var(--muted);
  }
  .confirm {
    margin: 0 0 4px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .danger {
    background: var(--danger);
  }
  .del {
    color: var(--danger);
  }
  .code {
    display: inline-block;
    width: 34px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .codefield {
    margin-bottom: 6px;
  }
  .codefield input {
    width: 90px;
  }
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
