<script lang="ts">
  import DriveImage from '../lib/DriveImage.svelte'
  import Icon from '../lib/Icon.svelte'
  import InkTree from '../lib/InkTree.svelte'
  import { commonName } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { coverFor, db, isActive, ui, type Row } from '../lib/store.svelte'

  type Sort = 'age' | 'newest' | 'oldest' | 'price'
  const SORTS: { value: Sort; label: string }[] = [
    { value: 'age', label: 'Oldest tree' },
    { value: 'newest', label: 'Newest added' },
    { value: 'oldest', label: 'Oldest added' },
    { value: 'price', label: 'Price' },
  ]

  let query = $state('')
  let chip = $state('') // 'species:<v>' or 'style:<v>'
  let sort = $state<Sort>('age')

  // Chips only for species and styles actually in the collection.
  let chips = $derived.by(() => {
    const species = [...new Set(db.trees.map((t) => t.species).filter(Boolean))].sort()
    const styles = [...new Set(db.trees.map((t) => t.style).filter(Boolean))].sort()
    return [
      ...species.map((v) => ({ key: `species:${v}`, label: commonName(v) })),
      ...styles.map((v) => ({ key: `style:${v}`, label: v.replace(/\s*\(.*\)$/, '') })),
    ]
  })

  const compare: Record<Sort, (a: Row, b: Row) => number> = {
    newest: (a, b) => b.created_at.localeCompare(a.created_at),
    oldest: (a, b) => a.created_at.localeCompare(b.created_at),
    // Oldest first; trees without an estimated year go after, newest-added first.
    age: (a, b) => (Number(a.origin_year) || 9999) - (Number(b.origin_year) || 9999) || b.created_at.localeCompare(a.created_at),
    price: (a, b) => (Number(b.price_paid) || 0) - (Number(a.price_paid) || 0),
  }

  let visible = $derived.by(() => {
    const q = query.trim().toLowerCase()
    const [field, value] = chip ? [chip.slice(0, chip.indexOf(':')), chip.slice(chip.indexOf(':') + 1)] : ['', '']
    const list = db.trees.filter((t) => {
      if (field && t[field] !== value) return false
      if (!q) return true
      return [t.species, t.style, t.source, t.notes].some((s) => s?.toLowerCase().includes(q))
    })
    const sorted = [...list].sort(compare[sort])
    return [...sorted.filter(isActive), ...sorted.filter((t) => !isActive(t))]
  })

  let activeCount = $derived(db.trees.filter(isActive).length)
</script>

<header>
  <h1>Trees</h1>
  <span class="count">{activeCount}</span>
</header>

{#if db.trees.length === 0}
  <div class="empty">
    <InkTree size={110} />
    <p>No trees yet.</p>
    <button class="btn" onclick={() => (ui.addTree = true)}>Add your first tree</button>
  </div>
{:else}
  <div class="tools">
    <label class="search">
      <Icon name="search" size={18} />
      <input type="search" bind:value={query} placeholder="Search species, notes…" aria-label="Search trees" />
    </label>
    <select bind:value={sort} aria-label="Sort">
      {#each SORTS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
    </select>
  </div>

  {#if chips.length > 1}
    <div class="chips">
      <button class:on={!chip} onclick={() => (chip = '')}>All</button>
      {#each chips as c (c.key)}
        <button class:on={chip === c.key} onclick={() => (chip = chip === c.key ? '' : c.key)}>{c.label}</button>
      {/each}
    </div>
  {/if}

  {#if visible.length === 0}
    <p class="none">No trees match.</p>
  {:else}
    <div class="grid">
      {#each visible as tree (tree.id)}
        {@const cover = coverFor(tree)}
        <button class="tile" class:archived={!isActive(tree)} onclick={() => go('trees', tree.id)} aria-label={commonName(tree.species)}>
          {#if cover}
            <DriveImage fileId={cover.thumb_file_id || cover.drive_file_id} alt="" />
          {:else}
            <div class="blank">
              <InkTree size={56} />
              <span>{commonName(tree.species)}</span>
            </div>
          {/if}
          {#if !isActive(tree)}<span class="badge">{tree.status}</span>{/if}
        </button>
      {/each}
    </div>
  {/if}
{/if}

<style>
  header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 22px;
  }
  h1 {
    font-size: 40px;
  }
  .count {
    color: var(--muted);
    font-size: 18px;
    font-weight: 300;
  }
  .tools {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
  }
  .search {
    position: relative;
    display: flex;
    align-items: center;
    color: var(--muted);
  }
  .search :global(svg) {
    position: absolute;
    left: 13px;
    pointer-events: none;
  }
  .search input {
    padding-left: 38px;
  }
  .tools select {
    width: auto;
    font-size: 14px;
  }
  .chips {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin: 14px calc(-1 * var(--gutter)) 0;
    padding: 0 var(--gutter);
    scrollbar-width: none;
  }
  .chips::-webkit-scrollbar {
    display: none;
  }
  .chips button {
    flex: none;
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-size: 14px;
    color: var(--ink-soft);
    white-space: nowrap;
  }
  .chips button.on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--bg);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-top: 20px;
  }
  @media (min-width: 560px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .tile {
    position: relative;
    aspect-ratio: 4 / 5;
    border-radius: 10px;
    overflow: hidden;
    background: var(--line);
    transition: transform 0.15s ease;
  }
  .tile:active {
    transform: scale(0.98);
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
    padding: 12px;
    text-align: center;
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
  .empty {
    margin-top: 16vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: var(--muted);
  }
  .empty p,
  .none {
    margin: 0;
    color: var(--muted);
    font-size: 15px;
  }
  .none {
    margin-top: 28px;
  }
</style>
