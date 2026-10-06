<script lang="ts">
  // Photo grid shared by Trees and Pots: search, filter chips, sort, archived last.
  import DriveImage from '../lib/DriveImage.svelte'
  import Icon from '../lib/Icon.svelte'
  import InkTree from '../lib/InkTree.svelte'
  import { commonName, statusLabel } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { coverFor, db, getMaker, isActive, ui, type Kind, type Row } from '../lib/store.svelte'

  let { kind }: { kind: Kind } = $props()

  const stripNative = (v: string) => v.replace(/\s*\(.*\)$/, '')
  const makerName = (r: Row) => getMaker(r.maker_id)?.name ?? ''

  // Per-kind wording and fields.
  let cfg = $derived(
    kind === 'tree'
      ? {
          title: 'Trees',
          rows: db.trees,
          priceField: 'price_paid',
          oldestLabel: 'Oldest tree',
          placeholder: 'Search species, notes…',
          search: (r: Row) => [r.species, r.style, r.source, r.notes],
          blankLabel: (r: Row) => commonName(r.species),
          chipFields: [
            { field: 'species', label: (v: string) => commonName(v), value: (r: Row) => r.species },
            { field: 'style', label: stripNative, value: (r: Row) => r.style },
          ],
          route: 'trees' as const,
          add: (): void => {
            ui.addTree = true
          },
        }
      : {
          title: 'Pots',
          rows: db.pots,
          priceField: 'price',
          oldestLabel: 'Oldest pot',
          placeholder: 'Search maker, colour, notes…',
          search: (r: Row) => [makerName(r), r.style, r.glaze_colour, r.source, r.notes],
          blankLabel: (r: Row) => [makerName(r), r.style].filter(Boolean).join(' · '),
          chipFields: [
            { field: 'maker_id', label: (v: string) => getMaker(v)?.name ?? v, value: (r: Row) => r.maker_id },
            { field: 'style', label: (v: string) => v, value: (r: Row) => r.style },
          ],
          route: 'pots' as const,
          add: (): void => {
            ui.addPot = true
          },
        },
  )

  type Sort = 'age' | 'newest' | 'oldest' | 'price'
  let sorts = $derived<{ value: Sort; label: string }[]>([
    { value: 'age', label: cfg.oldestLabel },
    { value: 'newest', label: 'Newest added' },
    { value: 'oldest', label: 'Oldest added' },
    { value: 'price', label: 'Price' },
  ])

  let query = $state('')
  let chip = $state('') // '<field>:<value>'
  let sort = $state<Sort>('age')

  // Chips only for values actually present in the collection.
  let chips = $derived(
    cfg.chipFields.flatMap(({ field, label, value }) =>
      [...new Set(cfg.rows.map(value).filter(Boolean))]
        .map((v) => ({ key: `${field}:${v}`, label: label(v) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ),
  )

  let visible = $derived.by(() => {
    const q = query.trim().toLowerCase()
    const sep = chip.indexOf(':')
    const [field, value] = chip ? [chip.slice(0, sep), chip.slice(sep + 1)] : ['', '']
    const price = cfg.priceField
    const compare: Record<Sort, (a: Row, b: Row) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      // Oldest first; items without an estimated year go after, newest-added first.
      age: (a, b) => (Number(a.origin_year) || 9999) - (Number(b.origin_year) || 9999) || b.created_at.localeCompare(a.created_at),
      price: (a, b) => (Number(b[price]) || 0) - (Number(a[price]) || 0),
    }
    const list = cfg.rows.filter((r) => {
      if (field && r[field] !== value) return false
      if (!q) return true
      return cfg.search(r).some((s) => s?.toLowerCase().includes(q))
    })
    const sorted = [...list].sort(compare[sort])
    return [...sorted.filter(isActive), ...sorted.filter((r) => !isActive(r))]
  })

  let activeCount = $derived(cfg.rows.filter(isActive).length)
</script>

<header>
  <h1>{cfg.title}</h1>
  <span class="count">{activeCount}</span>
</header>

{#if cfg.rows.length === 0}
  <div class="empty">
    {#if kind === 'tree'}<InkTree size={110} />{:else}<Icon name="pot" size={64} />{/if}
    <p>No {kind}s yet.</p>
    <button class="btn" onclick={cfg.add}>Add your first {kind}</button>
  </div>
{:else}
  <div class="tools">
    <label class="search">
      <Icon name="search" size={18} />
      <input type="search" bind:value={query} placeholder={cfg.placeholder} aria-label={`Search ${kind}s`} />
    </label>
    <select bind:value={sort} aria-label="Sort">
      {#each sorts as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
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
    <p class="none">No {kind}s match.</p>
  {:else}
    <div class="grid">
      {#each visible as item (item.id)}
        {@const cover = coverFor(item, kind)}
        <button class="tile" class:archived={!isActive(item)} onclick={() => go(cfg.route, item.id)} aria-label={cfg.blankLabel(item) || cfg.title}>
          {#if cover}
            <DriveImage fileId={cover.thumb_file_id || cover.drive_file_id} alt="" />
          {:else}
            <div class="blank">
              {#if kind === 'tree'}<InkTree size={56} />{:else}<Icon name="pot" size={40} />{/if}
              <span>{cfg.blankLabel(item)}</span>
            </div>
          {/if}
          {#if !isActive(item)}<span class="badge">{statusLabel(item.status, kind)}</span>{/if}
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
