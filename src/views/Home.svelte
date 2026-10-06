<script lang="ts">
  import { ensureFreshToken } from '../lib/auth'
  import type { Workspace } from '../lib/drive'
  import { dueByType, nextUpcoming } from '../lib/due'
  import { commonName, fmtDate, todayISO } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { db, getTree, isActive, openLogCare, type Row } from '../lib/store.svelte'

  let { workspace }: { workspace: Workspace } = $props()

  const today = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  let treeCount = $derived(db.trees.filter(isActive).length)
  let potCount = $derived(db.pots.filter(isActive).length)

  // Due now: in-season care only (out of season is never "due"), grouped by care type.
  let due = $derived([...dueByType().entries()])
  let upcoming = $derived(due.length ? null : nextUpcoming())

  // Recent care: newest first, with a round shown as one line.
  type Recent = { key: string; careType: string; date: string; created: string; entries: Row[] }
  let recent = $derived.by(() => {
    const groups = new Map<string, Recent>()
    for (const c of db.careLog) {
      const key = c.round_id || c.id
      const g = groups.get(key)
      if (g) g.entries.push(c)
      else groups.set(key, { key, careType: c.care_type, date: c.date, created: c.created_at, entries: [c] })
    }
    return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || b.created.localeCompare(a.created)).slice(0, 5)
  })
  let expanded = $state<string | null>(null)

  const treeName = (id: string) => commonName(getTree(id)?.species ?? '') || 'Unknown'

  function logDue(careType: string, trees: Row[]) {
    ensureFreshToken()
    openLogCare({ careType, treeIds: trees.map((t) => t.id) })
  }

  function shortDate(iso: string) {
    if (iso === todayISO()) return 'today'
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }
</script>

<header>
  <p class="label">{today}</p>
  <h1>Collection</h1>
</header>

<section class="stats">
  <button class="stat" onclick={() => go('trees')}>
    <span class="n">{treeCount}</span>
    <span class="label">Trees</span>
  </button>
  <button class="stat" onclick={() => go('pots')}>
    <span class="n">{potCount}</span>
    <span class="label">Pots</span>
  </button>
</section>

<section>
  <h2 class="label">Due now</h2>
  {#if due.length === 0}
    <p class="empty">
      Nothing due{#if upcoming}{' · '}<span class="next">next: {upcoming.careType}, {shortDate(upcoming.date)}{upcoming.count > 1 ? ` (${upcoming.count} trees)` : ''}</span>{/if}
    </p>
  {:else}
    <ul class="due">
      {#each due as [careType, trees] (careType)}
        <li>
          <button onclick={() => logDue(careType, trees)}>
            <span class="dot" aria-hidden="true"></span>
            <span class="what">
              <span class="type">{careType}</span>
              <span class="who">{trees.slice(0, 3).map((t) => commonName(t.species) || 'Unknown').join(', ')}{trees.length > 3 ? ` +${trees.length - 3}` : ''}</span>
            </span>
            <span class="count">{trees.length} tree{trees.length === 1 ? '' : 's'} ›</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section>
  <h2 class="label">Recent care</h2>
  {#if recent.length === 0}
    <p class="empty">No care logged yet.</p>
  {:else}
    <ul class="recent">
      {#each recent as r (r.key)}
        <li>
          {#if r.entries.length > 1}
            <button class="line" onclick={() => (expanded = expanded === r.key ? null : r.key)} aria-expanded={expanded === r.key}>
              <span class="date">{fmtDate(r.date)}</span>
              <span class="type">{r.careType}</span>
              <span class="meta">{r.entries.length} trees {expanded === r.key ? '▴' : '▾'}</span>
            </button>
            {#if expanded === r.key}
              <ul class="trees">
                {#each r.entries as c (c.id)}
                  <li>
                    <button onclick={() => go('trees', c.tree_id)}>
                      {treeName(c.tree_id)}{c.product ? ` · ${c.product}` : ''}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          {:else}
            <button class="line" onclick={() => go('trees', r.entries[0].tree_id)}>
              <span class="date">{fmtDate(r.date)}</span>
              <span class="type">{r.careType}</span>
              <span class="meta">{treeName(r.entries[0].tree_id)}</span>
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<p class="drive">Connected to Drive as {workspace.email}</p>

<style>
  header {
    margin-bottom: 36px;
  }
  h1 {
    font-size: 40px;
    margin-top: 6px;
  }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    margin-bottom: 40px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 22px 0;
    text-align: left;
  }
  .stat + .stat {
    border-left: 1px solid var(--line);
    padding-left: 22px;
  }
  .n {
    font-family: var(--display);
    font-size: 44px;
    font-weight: 200;
    line-height: 1;
  }
  section + section {
    margin-top: 36px;
  }
  h2 {
    margin-bottom: 10px;
  }
  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 15px;
  }
  .next {
    color: var(--ink-soft);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .due li button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    margin-bottom: 8px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--line);
    text-align: left;
    transition: transform 0.15s ease;
  }
  .due li button:active {
    transform: scale(0.99);
  }
  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--ink);
  }
  .what {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .what .type {
    font-size: 17px;
  }
  .who {
    font-size: 13px;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .count {
    flex: none;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .recent > li {
    border-bottom: 1px solid var(--line);
  }
  .line {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding: 13px 0;
    text-align: left;
  }
  .line .date {
    flex: none;
    width: 86px;
    font-size: 13px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .line .type {
    flex: 1;
    font-size: 15px;
  }
  .line .meta {
    flex: none;
    font-size: 13px;
    color: var(--muted);
  }
  .trees {
    padding: 0 0 12px 100px;
  }
  .trees button {
    padding: 5px 0;
    font-size: 14px;
    color: var(--ink-soft);
    text-align: left;
  }
  .drive {
    margin-top: 56px;
    font-size: 12px;
    color: var(--muted);
  }
</style>
