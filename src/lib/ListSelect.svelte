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
  let saving = $state(false)
  let error = $state('')
  let options = $derived(listValues(list))

  function onchange(e: Event) {
    const v = (e.currentTarget as HTMLSelectElement).value
    if (v === NEW) {
      adding = true
      draft = ''
      ;(e.currentTarget as HTMLSelectElement).value = value
    } else value = v
  }

  async function saveNew() {
    if (!draft.trim()) return
    saving = true
    error = ''
    try {
      await addListValue(list, draft)
      value = options.find((o) => o.toLowerCase() === draft.trim().toLowerCase()) ?? draft.trim()
      adding = false
    } catch (e) {
      error = (e as Error).message
    } finally {
      saving = false
    }
  }
</script>

<div class="field">
  <span class="label">{label}{required ? '' : ' · optional'}</span>
  {#if adding}
    <div class="new">
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:value={draft} placeholder={`New ${label.toLowerCase()}`} autofocus onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), saveNew())} />
      <button class="mini" onclick={saveNew} disabled={saving || !draft.trim()}>{saving ? 'Adding…' : 'Add'}</button>
      <button class="mini ghost" onclick={() => (adding = false)} disabled={saving}>Cancel</button>
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
