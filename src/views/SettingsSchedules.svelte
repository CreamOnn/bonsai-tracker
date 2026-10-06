<script lang="ts">
  // Settings → Schedules: per care type, the default season and each species' interval (+ optional own season).
  import BottomSheet from '../lib/BottomSheet.svelte'
  import Icon from '../lib/Icon.svelte'
  import IntervalInput from '../lib/IntervalInput.svelte'
  import MonthPicker from '../lib/MonthPicker.svelte'
  import { fmtInterval, fmtMonths, schedulableTypes } from '../lib/due'
  import { commonName } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { db, getCareType, getSchedule, isActive, setCareTypeMonths, setSchedule } from '../lib/store.svelte'

  let types = $derived(schedulableTypes())
  let careType = $state(schedulableTypes()[0] ?? '')
  let ct = $derived(getCareType(careType))

  // Species in the collection, plus any species that already has a schedule row.
  let species = $derived.by(() => {
    const counts = new Map<string, number>()
    for (const t of db.trees) if (isActive(t) && t.species) counts.set(t.species, (counts.get(t.species) ?? 0) + 1)
    for (const s of db.schedules) if (s.species && !counts.has(s.species)) counts.set(s.species, 0)
    return [...counts.entries()].sort((a, b) => commonName(a[0]).localeCompare(commonName(b[0])))
  })

  let busy = $state(false)
  let error = $state('')

  // Season sheet (care type default)
  let seasonOpen = $state(false)
  let seasonDraft = $state('')
  function editSeason() {
    seasonDraft = ct?.active_months ?? ''
    error = ''
    seasonOpen = true
  }
  async function saveSeason() {
    await run(() => setCareTypeMonths(careType, seasonDraft), () => (seasonOpen = false))
  }

  // Species sheet
  let speciesOpen = $state(false)
  let editingSpecies = $state('')
  let intervalDraft = $state('')
  let ownSeason = $state(false)
  let monthsDraft = $state('')
  function editSpecies(sp: string) {
    const row = getSchedule({ species: sp }, careType)
    editingSpecies = sp
    intervalDraft = row?.interval_days ?? ''
    monthsDraft = row?.active_months ?? ''
    ownSeason = !!row?.active_months
    error = ''
    speciesOpen = true
  }
  async function saveSpecies() {
    await run(
      () => setSchedule({ species: editingSpecies }, careType, { interval_days: intervalDraft, active_months: ownSeason ? monthsDraft : '' }),
      () => (speciesOpen = false),
    )
  }

  async function run(fn: () => Promise<unknown>, after: () => void) {
    busy = true
    error = ''
    try {
      await fn()
      after()
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

<button class="back" onclick={() => go('settings')}><Icon name="back" size={18} /> Settings</button>
<h1>Schedules</h1>
<p class="intro">Set how often each species needs care. Trees use their species' interval unless you override it on the tree's page.</p>

{#if types.length === 0}
  <p class="intro">No care types are schedulable. Turn scheduling on in <button class="link" onclick={() => go('settings', 'care-types')}>Care types</button>.</p>
{:else}
  <div class="chips">
    {#each types as t (t)}
      <button class:on={careType === t} onclick={() => (careType = t)}>{t}</button>
    {/each}
  </div>

  <button class="row season" onclick={editSeason}>
    <span>
      <span class="label">Season</span>
      <span class="val">{fmtMonths(ct?.active_months ?? '')}</span>
    </span>
    <span class="edit">Edit</span>
  </button>

  <h2 class="label">Species</h2>
  {#if species.length === 0}
    <p class="intro">Add trees first. Their species appear here.</p>
  {:else}
    <ul>
      {#each species as [sp, count] (sp)}
        {@const row = getSchedule({ species: sp }, careType)}
        <li>
          <button class="row" onclick={() => editSpecies(sp)}>
            <span>
              <span class="name">{commonName(sp)}</span>
              <span class="meta">{count} tree{count === 1 ? '' : 's'}{row?.active_months ? ` · ${fmtMonths(row.active_months)}` : ''}</span>
            </span>
            <span class="val" class:none={!row?.interval_days}>{row?.interval_days ? fmtInterval(Number(row.interval_days)) : 'Not set'}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<BottomSheet bind:open={seasonOpen} title={`${careType} season`} {busy}>
  <p class="intro">Months when {careType.toLowerCase()} can be due. Leave all off for all year.</p>
  <MonthPicker bind:value={seasonDraft} />
  <p class="summary">{fmtMonths(seasonDraft)}</p>
  <div class="form-actions">
    {#if error}<p class="form-error">{error}</p>{/if}
    <button class="btn" onclick={saveSeason} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
  </div>
</BottomSheet>

<BottomSheet bind:open={speciesOpen} title={commonName(editingSpecies)} {busy}>
  <div class="field">
    <span class="label">{careType} interval</span>
    {#key editingSpecies + careType}<IntervalInput bind:value={intervalDraft} />{/key}
  </div>
  <label class="toggle">
    <input type="checkbox" bind:checked={ownSeason} />
    <span>Own season <span class="muted">(default {fmtMonths(ct?.active_months ?? '')})</span></span>
  </label>
  {#if ownSeason}
    <div class="months"><MonthPicker bind:value={monthsDraft} /></div>
    <p class="summary">{fmtMonths(monthsDraft)}</p>
  {/if}
  <div class="form-actions">
    {#if error}<p class="form-error">{error}</p>{/if}
    <button class="btn" onclick={saveSpecies} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
  </div>
</BottomSheet>

<style>
  h1 {
    font-size: 40px;
  }
  .intro {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
  }
  .link {
    text-decoration: underline;
  }
  .chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 24px 0 8px;
  }
  .chips button {
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-size: 14px;
    color: var(--ink-soft);
  }
  .chips button.on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--bg);
  }
  h2 {
    margin: 32px 0 4px;
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
    gap: 16px;
    min-height: 58px;
    padding: 10px 0;
    border-bottom: 1px solid var(--line);
    text-align: left;
  }
  .row > span:first-child {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .season {
    margin-top: 12px;
  }
  .name {
    font-size: 16px;
  }
  .meta {
    font-size: 12px;
    color: var(--muted);
  }
  .val {
    font-size: 15px;
  }
  .val.none,
  .edit,
  .muted {
    color: var(--muted);
  }
  .edit {
    font-size: 14px;
  }
  .summary {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 22px;
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
  .months {
    margin-top: 14px;
  }
</style>
