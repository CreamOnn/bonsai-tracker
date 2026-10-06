<script lang="ts">
  import { untrack } from 'svelte'
  import BottomSheet from '../lib/BottomSheet.svelte'
  import DriveImage from '../lib/DriveImage.svelte'
  import Icon from '../lib/Icon.svelte'
  import ListSelect from '../lib/ListSelect.svelte'
  import { statusLabel } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { coverFor, getMaker, isActive, potsByMaker, saveMaker } from '../lib/store.svelte'

  let { id }: { id: string } = $props()

  let maker = $derived(getMaker(id))
  let pots = $derived([...potsByMaker(id)].sort((a, b) => Number(isActive(b)) - Number(isActive(a))))

  let editing = $state(false)
  let busy = $state(false)
  let name = $state('')
  let country = $state('')
  let error = $state('')

  function startEdit() {
    const m = untrack(() => maker)
    if (!m) return
    name = m.name
    country = m.country
    error = ''
    editing = true
  }

  async function save() {
    busy = true
    error = ''
    try {
      await saveMaker({ name, country }, id)
      editing = false
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

<button class="back" onclick={() => history.back()}><Icon name="back" size={18} /> Back</button>

{#if !maker}
  <p class="missing">This maker couldn't be found.</p>
{:else}
  <p class="label">Maker</p>
  <div class="head">
    <h1>{maker.name}</h1>
    <button class="edit" onclick={startEdit} aria-label="Edit maker"><Icon name="edit" size={20} /></button>
  </div>
  {#if maker.country}<p class="country">{maker.country}</p>{/if}

  <h2 class="label">Pots · {pots.length}</h2>
  {#if pots.length === 0}
    <p class="none">No pots by this maker yet.</p>
  {:else}
    <div class="grid">
      {#each pots as pot (pot.id)}
        {@const cover = coverFor(pot, 'pot')}
        <button class="tile" class:archived={!isActive(pot)} onclick={() => go('pots', pot.id)} aria-label={pot.style || 'Pot'}>
          {#if cover}
            <DriveImage fileId={cover.thumb_file_id || cover.drive_file_id} alt="" />
          {:else}
            <div class="blank"><Icon name="pot" size={36} /><span>{pot.style}</span></div>
          {/if}
          {#if !isActive(pot)}<span class="badge">{statusLabel(pot.status, 'pot')}</span>{/if}
        </button>
      {/each}
    </div>
  {/if}

  <BottomSheet bind:open={editing} title="Edit maker" {busy}>
    <label class="field">
      <span class="label">Name</span>
      <input bind:value={name} />
    </label>
    <ListSelect label="Country" list="country" bind:value={country} />
    <div class="form-actions">
      {#if error}<p class="form-error">{error}</p>{/if}
      <button class="btn" onclick={save} disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save changes'}</button>
    </div>
  </BottomSheet>
{/if}

<style>
  .missing,
  .none {
    color: var(--muted);
    font-size: 15px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 6px;
  }
  h1 {
    font-size: 34px;
  }
  .edit {
    color: var(--muted);
    padding: 8px;
  }
  .country {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 15px;
  }
  h2 {
    margin: 36px 0 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 5;
    border-radius: 10px;
    overflow: hidden;
    background: var(--line);
  }
  .tile.archived {
    filter: grayscale(1);
    opacity: 0.45;
  }
  .blank {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--surface);
    color: var(--muted);
    font-size: 13px;
  }
  .badge {
    position: absolute;
    left: 8px;
    bottom: 8px;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--bg);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
</style>
