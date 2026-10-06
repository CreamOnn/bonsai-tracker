<script lang="ts">
  import { untrack } from 'svelte'
  import ListSelect from '../lib/ListSelect.svelte'
  import { cleanNumber } from '../lib/format'
  import { saveTree, type Row } from '../lib/store.svelte'

  let {
    tree,
    onsaved,
    busy = $bindable(false),
  }: { tree?: Row; onsaved: (t: Row) => void; busy?: boolean } = $props()

  // Snapshot of the starting values; the form edits a local copy.
  const start = untrack(() => tree)
  let species = $state(start?.species ?? '')
  let style = $state(start?.style ?? '')
  let originYear = $state(start?.origin_year ?? '')
  let price = $state(start?.price_paid ?? '')
  let source = $state(start?.source ?? '')
  let notes = $state(start?.notes ?? '')
  let error = $state('')

  const thisYear = new Date().getFullYear()
  let yearInvalid = $derived(originYear !== '' && (Number(originYear) < 1000 || Number(originYear) > thisYear))

  async function save() {
    if (!species || yearInvalid) return
    busy = true
    error = ''
    try {
      const saved = await saveTree(
        {
          species,
          style,
          origin_year: cleanNumber(originYear).split('.')[0],
          price_paid: cleanNumber(price),
          source: source.trim(),
          notes: notes.trim(),
        },
        tree?.id,
      )
      onsaved(saved)
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

<ListSelect label="Species" list="species" bind:value={species} required />
<ListSelect label="Style" list="tree_style" bind:value={style} />

<div class="row2">
  <label class="field">
    <span class="label">Est. year · optional</span>
    <input bind:value={originYear} inputmode="numeric" placeholder="e.g. 1995" maxlength="4" />
  </label>
  <label class="field">
    <span class="label">Price paid · optional</span>
    <input bind:value={price} inputmode="decimal" placeholder="$0" />
  </label>
</div>
{#if yearInvalid}<p class="form-error hint">Enter a year between 1000 and {thisYear}.</p>{/if}

<label class="field">
  <span class="label">Source · optional</span>
  <input bind:value={source} placeholder="Nursery, club, collected…" />
</label>

<label class="field">
  <span class="label">Notes · optional</span>
  <textarea bind:value={notes} rows="3"></textarea>
</label>

<div class="form-actions">
  {#if error}<p class="form-error">{error}</p>{/if}
  <button class="btn" onclick={save} disabled={!species || yearInvalid || busy}>
    {busy ? 'Saving…' : tree ? 'Save changes' : 'Add tree'}
  </button>
</div>

<style>
  .hint {
    margin-top: 8px;
    font-size: 13px;
  }
</style>
