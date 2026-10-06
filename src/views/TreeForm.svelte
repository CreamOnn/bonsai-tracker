<script lang="ts">
  import { untrack } from 'svelte'
  import ListSelect from '../lib/ListSelect.svelte'
  import { cleanNumber, commonName } from '../lib/format'
  import { isPSensitive, saveTree, setSpeciesPSensitive, speciesPSensitive, type Row } from '../lib/store.svelte'

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

  // Phosphorus sensitivity (SPEC §6a). Follows the species unless the user ticks it differently,
  // in which case they choose whether the change is for this tree or the whole species.
  let pSensitive = $state(start ? isPSensitive(start) : false)
  let pTouched = $state(false)
  let pScope = $state<'' | 'tree' | 'species'>(start?.p_sensitive ? 'tree' : '')
  let speciesFlag = $derived(speciesPSensitive(species))
  let pDiffers = $derived(!!species && pSensitive !== speciesFlag)

  // Choosing a different species resets the tick to that species' flag (an existing
  // tree's own override is kept until the species actually changes).
  let lastSpecies = start?.species ?? ''
  $effect(() => {
    const sp = species
    if (sp === lastSpecies) return
    lastSpecies = sp
    untrack(() => {
      if (pTouched) return
      pSensitive = speciesPSensitive(sp)
      pScope = ''
    })
  })

  const thisYear = new Date().getFullYear()
  let yearInvalid = $derived(originYear !== '' && (Number(originYear) < 1000 || Number(originYear) > thisYear))
  let needsScope = $derived(pDiffers && !pScope)

  async function save() {
    if (!species || yearInvalid || needsScope) return
    busy = true
    error = ''
    try {
      let override = ''
      if (pDiffers && pScope === 'species') await setSpeciesPSensitive(species, pSensitive)
      else if (pDiffers) override = pSensitive ? 'y' : 'n'
      const saved = await saveTree(
        {
          species,
          style,
          origin_year: cleanNumber(originYear).split('.')[0],
          price_paid: cleanNumber(price),
          source: source.trim(),
          notes: notes.trim(),
          p_sensitive: override,
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

<label class="toggle">
  <input
    type="checkbox"
    bind:checked={pSensitive}
    onchange={() => {
      pTouched = true
      pScope = ''
    }}
  />
  <span>Phosphorus sensitive <span class="muted">· needs low-P fertiliser</span></span>
</label>
{#if pDiffers}
  <div class="scope" role="radiogroup" aria-label="Apply to">
    <p>Apply this to:</p>
    <button role="radio" aria-checked={pScope === 'tree'} class:on={pScope === 'tree'} onclick={() => (pScope = 'tree')}>Just this tree</button>
    <button role="radio" aria-checked={pScope === 'species'} class:on={pScope === 'species'} onclick={() => (pScope = 'species')}>
      All {commonName(species)} trees
    </button>
  </div>
{/if}

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
  {#if needsScope}<p class="form-error">Choose whether the phosphorus setting is for this tree or all {commonName(species)} trees.</p>{/if}
  <button class="btn" onclick={save} disabled={!species || yearInvalid || needsScope || busy}>
    {busy ? 'Saving…' : tree ? 'Save changes' : 'Add tree'}
  </button>
</div>

<style>
  .hint {
    margin-top: 8px;
    font-size: 13px;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 14px 0 20px;
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
  .scope {
    margin: -6px 0 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .scope p {
    margin: 0 4px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .scope button {
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-size: 14px;
    color: var(--ink-soft);
  }
  .scope button.on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--bg);
  }
</style>
