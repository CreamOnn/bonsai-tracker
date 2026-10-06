<script lang="ts">
  // Picks a maker from the Makers tab, or creates one inline (name + country).
  import ListSelect from './ListSelect.svelte'
  import { makersSorted, saveMaker } from './store.svelte'

  let { value = $bindable('') }: { value?: string } = $props()

  const NEW = '__new__'
  let adding = $state(false)
  let name = $state('')
  let country = $state('')
  let saving = $state(false)
  let error = $state('')
  let makers = $derived(makersSorted())

  function onchange(e: Event) {
    const el = e.currentTarget as HTMLSelectElement
    if (el.value === NEW) {
      adding = true
      name = ''
      country = ''
      el.value = value
    } else value = el.value
  }

  async function add() {
    if (!name.trim()) return
    saving = true
    error = ''
    try {
      const maker = await saveMaker({ name, country })
      value = maker.id
      adding = false
    } catch (e) {
      error = (e as Error).message
    } finally {
      saving = false
    }
  }
</script>

{#if adding}
  <div class="newmaker">
    <label class="field">
      <span class="label">New maker</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:value={name} placeholder="e.g. Tokoname Shuho" autofocus />
    </label>
    <ListSelect label="Country" list="country" bind:value={country} />
    <div class="btns">
      <button class="btn" onclick={add} disabled={saving || !name.trim()}>{saving ? 'Adding…' : 'Add maker'}</button>
      <button class="btn ghost" onclick={() => (adding = false)} disabled={saving}>Cancel</button>
    </div>
    {#if error}<p class="form-error">{error}</p>{/if}
  </div>
{:else}
  <div class="field">
    <span class="label">Maker · optional</span>
    <select {onchange} value={value || ''} class:placeholder={!value}>
      <option value="">Unknown</option>
      {#each makers as m (m.id)}<option value={m.id}>{m.name}{m.country ? ` · ${m.country}` : ''}</option>{/each}
      <option value={NEW}>＋ Add new maker…</option>
    </select>
  </div>
{/if}

<style>
  .newmaker {
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 18px;
  }
  .btns .btn {
    height: 44px;
    font-size: 15px;
  }
  .placeholder {
    color: var(--muted);
  }
</style>
