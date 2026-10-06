<script lang="ts">
  import { untrack } from 'svelte'
  import ListSelect from '../lib/ListSelect.svelte'
  import MakerPicker from '../lib/MakerPicker.svelte'
  import { cleanNumber, isRound } from '../lib/format'
  import { saveRecord, type Row } from '../lib/store.svelte'

  let { pot, onsaved, busy = $bindable(false) }: { pot?: Row; onsaved: (p: Row) => void; busy?: boolean } = $props()

  const start = untrack(() => pot)
  let makerId = $state(start?.maker_id ?? '')
  let style = $state(start?.style ?? '')
  let length = $state(start?.length_cm ?? '')
  let width = $state(start?.width_cm ?? '')
  let height = $state(start?.height_cm ?? '')
  let glaze = $state(start?.glaze ?? '')
  let colour = $state(start?.glaze_colour ?? '')
  let originYear = $state(start?.origin_year ?? '')
  let price = $state(start?.price ?? '')
  let source = $state(start?.source ?? '')
  let notes = $state(start?.notes ?? '')
  let error = $state('')

  let round = $derived(isRound(style))
  const thisYear = new Date().getFullYear()
  let yearInvalid = $derived(originYear !== '' && (Number(originYear) < 1000 || Number(originYear) > thisYear))

  async function save() {
    if (!style || yearInvalid) return
    busy = true
    error = ''
    try {
      const saved = await saveRecord(
        'pot',
        {
          maker_id: makerId,
          style,
          length_cm: cleanNumber(length),
          // Round pots: length holds the diameter, width is unused.
          width_cm: round ? '' : cleanNumber(width),
          height_cm: cleanNumber(height),
          glaze,
          glaze_colour: colour,
          origin_year: cleanNumber(originYear).split('.')[0],
          price: cleanNumber(price),
          source: source.trim(),
          notes: notes.trim(),
        },
        pot?.id,
      )
      onsaved(saved)
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

<ListSelect label="Style" list="pot_style" bind:value={style} required />

<div class="gap"><MakerPicker bind:value={makerId} /></div>

<div class="field">
  <span class="label">Size (outside, cm) · optional</span>
  {#if round}
    <div class="dims two">
      <input bind:value={length} inputmode="decimal" placeholder="Ø" aria-label="Diameter in cm" />
      <span>×</span>
      <input bind:value={height} inputmode="decimal" placeholder="H" aria-label="Height in cm" />
    </div>
  {:else}
    <div class="dims">
      <input bind:value={length} inputmode="decimal" placeholder="L" aria-label="Length in cm" />
      <span>×</span>
      <input bind:value={width} inputmode="decimal" placeholder="W" aria-label="Width in cm" />
      <span>×</span>
      <input bind:value={height} inputmode="decimal" placeholder="H" aria-label="Height in cm" />
    </div>
  {/if}
</div>

<div class="field">
  <span class="label">Finish · optional</span>
  <div class="seg" role="radiogroup" aria-label="Finish">
    {#each [['glazed', 'Glazed'], ['unglazed', 'Unglazed']] as [v, label] (v)}
      <button role="radio" aria-checked={glaze === v} class:on={glaze === v} onclick={() => (glaze = glaze === v ? '' : v)}>{label}</button>
    {/each}
  </div>
</div>

<ListSelect label="Colour" list="glaze_colour" bind:value={colour} />

<div class="row2">
  <label class="field">
    <span class="label">Est. year · optional</span>
    <input bind:value={originYear} inputmode="numeric" placeholder="e.g. 1980" maxlength="4" />
  </label>
  <label class="field">
    <span class="label">Price · optional</span>
    <input bind:value={price} inputmode="decimal" placeholder="$0" />
  </label>
</div>
{#if yearInvalid}<p class="form-error hint">Enter a year between 1000 and {thisYear}.</p>{/if}

<label class="field">
  <span class="label">Source · optional</span>
  <input bind:value={source} placeholder="Dealer, auction, show…" />
</label>

<label class="field">
  <span class="label">Notes · optional</span>
  <textarea bind:value={notes} rows="3"></textarea>
</label>

<div class="form-actions">
  {#if error}<p class="form-error">{error}</p>{/if}
  <button class="btn" onclick={save} disabled={!style || yearInvalid || busy}>{busy ? 'Saving…' : pot ? 'Save changes' : 'Add pot'}</button>
</div>

<style>
  .gap {
    margin: 20px 0;
  }
  .dims {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    gap: 8px;
    color: var(--muted);
  }
  .dims.two {
    grid-template-columns: 1fr auto 1fr;
  }
  .dims input {
    text-align: center;
  }
  .seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: var(--line);
  }
  .seg button {
    height: 40px;
    border-radius: 10px;
    font-size: 15px;
    color: var(--ink-soft);
  }
  .seg button.on {
    background: var(--surface);
    color: var(--ink);
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(28, 27, 25, 0.08);
  }
  .hint {
    margin-top: 8px;
    font-size: 13px;
  }
</style>
