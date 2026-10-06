<script lang="ts">
  // Settings → Species: flag species as phosphorus-sensitive. Trees can still override on their own form.
  import Icon from '../lib/Icon.svelte'
  import { commonName, latinName } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { db, isActive, listValues, setSpeciesPSensitive, speciesPSensitive } from '../lib/store.svelte'

  let query = $state('')
  let pending = $state<string | null>(null)
  let error = $state('')

  let counts = $derived.by(() => {
    const m = new Map<string, number>()
    for (const t of db.trees) if (isActive(t)) m.set(t.species, (m.get(t.species) ?? 0) + 1)
    return m
  })

  // Species in the collection first, then the rest of the list.
  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return listValues('species')
      .filter((s) => !q || s.toLowerCase().includes(q))
      .sort((a, b) => Number(counts.has(b)) - Number(counts.has(a)) || commonName(a).localeCompare(commonName(b)))
  })

  /** "Acer buergerianum · 2 trees" */
  function subline(s: string) {
    const n = counts.get(s) ?? 0
    return [latinName(s) !== commonName(s) ? latinName(s) : '', n ? `${n} tree${n === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')
  }

  async function toggle(species: string) {
    pending = species
    error = ''
    try {
      await setSpeciesPSensitive(species, !speciesPSensitive(species))
    } catch (e) {
      error = (e as Error).message
    } finally {
      pending = null
    }
  }
</script>

<button class="back" onclick={() => go('settings')}><Icon name="back" size={18} /> Settings</button>
<h1>Species</h1>
<p class="intro">Tick species that need a phosphorus-safe fertiliser. Every tree of that species follows the tick unless it's set differently on the tree itself.</p>

<label class="search">
  <Icon name="search" size={18} />
  <input type="search" bind:value={query} placeholder="Search species" aria-label="Search species" />
</label>
{#if error}<p class="form-error">{error}</p>{/if}

<ul>
  {#each rows as s (s)}
    {@const on = speciesPSensitive(s)}
    <li>
      <button class="row" onclick={() => toggle(s)} disabled={pending !== null} aria-pressed={on}>
        <span class="name">
          <span>{commonName(s)}</span>
          <span class="meta">{subline(s)}</span>
        </span>
        <span class="tick" class:on>{pending === s ? '…' : on ? 'P-sensitive' : ''}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  h1 {
    font-size: 40px;
  }
  .intro {
    margin: 10px 0 20px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
  }
  .search {
    position: relative;
    display: flex;
    align-items: center;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .search :global(svg) {
    position: absolute;
    left: 13px;
    pointer-events: none;
  }
  .search input {
    padding-left: 38px;
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
    min-height: 56px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
    text-align: left;
  }
  .name {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 16px;
  }
  .meta {
    font-size: 12px;
    color: var(--muted);
    font-style: italic;
  }
  .tick {
    flex: none;
    min-width: 22px;
    height: 22px;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-size: 11px;
    font-weight: 500;
    display: grid;
    place-items: center;
    padding: 0 8px;
    color: var(--muted);
  }
  .tick.on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--bg);
  }
</style>
