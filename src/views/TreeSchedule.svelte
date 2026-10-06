<script lang="ts">
  // The tree page's Schedule section: one row per schedulable care type, with a per-tree interval override.
  import BottomSheet from '../lib/BottomSheet.svelte'
  import IntervalInput from '../lib/IntervalInput.svelte'
  import { dueFor, fmtInterval, fmtWindows, hasSchedule, schedulableTypes, type Due } from '../lib/due'
  import { commonName, fmtDate } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { ensureFreshToken } from '../lib/auth'
  import { getSchedule, isActive, openLogCare, setSchedule, type Row } from '../lib/store.svelte'

  let { tree }: { tree: Row } = $props()

  let rows = $derived(schedulableTypes().map((ct) => dueFor(tree, ct)))
  // Unscheduled types stay tucked away unless the user wants to add a tree-only schedule.
  let showUnscheduled = $state(false)
  let scheduled = $derived(new Set(schedulableTypes().filter((ct) => hasSchedule(tree, ct))))
  let visibleRows = $derived(showUnscheduled ? rows : rows.filter((d) => scheduled.has(d.careType)))
  let hiddenCount = $derived(rows.length - scheduled.size)

  let open = $state(false)
  let busy = $state(false)
  let editing = $state<Due | null>(null)
  let override = $state('')
  let error = $state('')

  // A due row goes straight to logging it; other rows open the tree-only interval.
  function tap(d: Due) {
    if (d.due) {
      ensureFreshToken()
      openLogCare({ treeId: tree.id, careType: d.careType })
    } else edit(d)
  }

  function edit(d: Due) {
    editing = d
    override = getSchedule({ treeId: tree.id }, d.careType)?.interval_days ?? ''
    error = ''
    open = true
  }

  async function save(value: string) {
    if (!editing) return
    busy = true
    error = ''
    try {
      await setSchedule({ treeId: tree.id }, editing.careType, value)
      open = false
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  function status(d: Due) {
    if (!d.interval) return 'No schedule'
    if (!isActive(tree)) return 'Archived'
    if (!d.inSeason) return d.nextSeason ? `Out of season · from ${fmtDayMonth(d.nextSeason)}` : 'Out of season'
    if (!d.last) return 'Due now · never logged'
    if (d.daysOver! > 0) return `${d.daysOver} day${d.daysOver === 1 ? '' : 's'} overdue`
    if (d.daysOver === 0) return 'Due today'
    return `Next ${fmtDate(d.next!)}`
  }

  /** 2027-03-01 → '1 Mar' */
  function fmtDayMonth(iso: string) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  let speciesDefault = $derived(
    editing && tree.species ? Number(getSchedule({ species: tree.species }, editing.careType)?.interval_days) || 0 : 0,
  )
</script>

<section>
  <h2 class="label">Schedule</h2>
  {#if visibleRows.length === 0}<p class="none">No schedules yet.</p>{/if}
  <ul>
    {#each visibleRows as d (d.careType)}
      <li>
        <button class="main" onclick={() => tap(d)} class:due={d.due}>
          <span class="type">{d.careType}</span>
          <span class="right">
            <span class="status">{status(d)}{d.due ? ' · log ›' : ''}</span>
            {#if d.interval}
              <span class="meta">{fmtInterval(d.interval)}{d.intervalSource === 'tree' ? ' · this tree' : ''}{d.last ? ` · last ${fmtDate(d.last)}` : ''}</span>
            {/if}
          </span>
        </button>
        {#if d.due}
          <button class="iv" onclick={() => edit(d)} aria-label={`Change ${d.careType} interval for this tree`}>Interval</button>
        {/if}
      </li>
    {/each}
  </ul>
  {#if hiddenCount > 0 && !showUnscheduled && isActive(tree)}
    <button class="addsched" onclick={() => (showUnscheduled = true)}>＋ Add a schedule for this tree</button>
  {/if}
  <p class="foot">Species intervals and seasons are set in <button onclick={() => go('settings', 'schedules')}>Settings → Schedules</button>.</p>
</section>

<BottomSheet bind:open title={editing ? `${editing.careType} schedule` : 'Schedule'} {busy}>
  {#if editing}
    <p class="explain">
      {#if speciesDefault}
        {commonName(tree.species)} default: <strong>{fmtInterval(speciesDefault)}</strong>. Set a different interval for just this tree, or leave it blank to use the default.
      {:else}
        No default for {commonName(tree.species) || 'this species'} yet. Set an interval for just this tree, or set a species default in Settings → Schedules.
      {/if}
    </p>
    <div class="field">
      <span class="label">This tree</span>
      <IntervalInput bind:value={override} placeholder={speciesDefault ? 'Default' : 'None'} />
    </div>
    <p class="season">Season: {fmtWindows(editing.windows)}{editing.windowSource === 'species' ? ` (${commonName(tree.species)})` : ''}</p>
    {#if editing.windows.some((w) => w.interval)}<p class="season">This species has its own interval per window. A tree interval here replaces it in every window.</p>{/if}
    <div class="form-actions">
      {#if error}<p class="form-error">{error}</p>{/if}
      <button class="btn" onclick={() => save(override)} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      {#if getSchedule({ treeId: tree.id }, editing.careType)}
        <button class="btn ghost" onclick={() => save('')} disabled={busy}>{speciesDefault ? 'Use species default' : 'Remove schedule'}</button>
      {/if}
    </div>
  {/if}
</BottomSheet>

<style>
  section {
    margin-top: 40px;
  }
  h2 {
    margin-bottom: 6px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--line);
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    min-height: 58px;
    padding: 10px 0;
    text-align: left;
  }
  .iv {
    flex: none;
    margin-left: 12px;
    padding: 0 0 0 12px;
    border-left: 1px solid var(--line);
    font-size: 12px;
    color: var(--muted);
  }
  .type {
    font-size: 16px;
  }
  .right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    text-align: right;
  }
  .status {
    font-size: 14px;
    color: var(--ink-soft);
  }
  .due .status {
    color: var(--ink);
    font-weight: 600;
  }
  .due .type::before {
    content: '';
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 8px;
    border-radius: 50%;
    background: var(--ink);
    vertical-align: middle;
  }
  .meta {
    font-size: 12px;
    color: var(--muted);
  }
  .none {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 15px;
  }
  .addsched {
    margin-top: 14px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink-soft);
  }
  .foot {
    margin: 12px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .foot button {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .explain {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .season {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
</style>
