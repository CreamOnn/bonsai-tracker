<script lang="ts">
  // Native picker over a Lists-tab list, with "Add new…" that saves the value to the list.
  import { addListValue, listValues } from './store.svelte'

  let {
    label,
    list,
    value = $bindable(''),
    required = false,
  }: { label: string; list: string; value?: string; required?: boolean } = $props()

  const NEW = '__new__'
  let adding = $state(false)
  let draft = $state('')
  let previous = ''
  let saving = $state(false)
  let error = $state('')
  let options = $derived(listValues(list))

  // While typing a new value it is already the field's value, so a form saved without
  // tapping "Add" keeps it. It joins the list on Add, Enter, or leaving the box.
  function startAdding() {
    previous = value
    draft = ''
    adding = true
  }

  function onchange(e: Event) {
    const v = (e.currentTarget as HTMLSelectElement).value
    if (v === NEW) {
      ;(e.currentTarget as HTMLSelectElement).value = value
      startAdding()
    } else value = v
  }

  function oninput() {
    value = draft.trim()
  }

  async function saveNew() {
    if (saving || !adding) return
    const v = draft.trim()
    if (!v) return cancel()
    saving = true
    error = ''
    try {
      await addListValue(list, v)
      value = options.find((o) => o.toLowerCase() === v.toLowerCase()) ?? v
      adding = false
    } catch (e) {
      error = (e as Error).message
    } finally {
      saving = false
    }
  }

  function cancel() {
    value = previous
    adding = false
    error = ''
  }
</script>

<div class="field">
  <div class="head">
    <span class="label">{label}{required ? '' : ' · optional'}</span>
    {#if !adding}
      <button class="addnew" onclick={startAdding} aria-label={`Add a new ${label.toLowerCase()}`}>＋ New</button>
    {/if}
  </div>
  {#if adding}
    <div class="new">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:value={draft}
        {oninput}
        onblur={saveNew}
        placeholder={`New ${label.toLowerCase()}`}
        autofocus
        onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), saveNew())}
      />
      <button class="mini" onclick={saveNew} disabled={saving || !draft.trim()}>{saving ? 'Adding…' : 'Add'}</button>
      <!-- pointerdown keeps focus in the box, so Cancel doesn't first save via blur -->
      <button class="mini ghost" onpointerdown={(e) => e.preventDefault()} onclick={cancel} disabled={saving}>Cancel</button>
    </div>
    {#if error}<p class="err">{error}</p>{/if}
  {:else}
    <select {onchange} value={value || ''} class:placeholder={!value}>
      <option value="" disabled={required}>{required ? 'Choose…' : 'None'}</option>
      {#each options as o (o)}<option value={o}>{o}</option>{/each}
      <option value={NEW}>＋ Add new…</option>
    </select>
  {/if}
</div>

<style>
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .addnew {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-soft);
    padding: 2px 0 2px 12px;
  }
  .new {
    display: flex;
    gap: 8px;
  }
  .new input {
    flex: 1;
    min-width: 0;
  }
  .mini {
    height: 48px;
    padding: 0 14px;
    border-radius: 12px;
    background: var(--ink);
    color: var(--bg);
    font-size: 14px;
    font-weight: 500;
  }
  .mini.ghost {
    background: transparent;
    color: var(--muted);
    padding: 0 6px;
  }
  .mini:disabled {
    opacity: 0.4;
  }
  .placeholder {
    color: var(--muted);
  }
  .err {
    color: var(--danger);
    font-size: 13px;
    margin: 6px 0 0;
  }
</style>
