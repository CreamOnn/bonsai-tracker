<script lang="ts">
  // Settings → Schedules (SPEC §6b): per care type, its default windows and each species'
  // base interval plus optional own windows (each with its own interval and product).
  import BottomSheet from '../lib/BottomSheet.svelte'
  import Icon from '../lib/Icon.svelte'
  import IntervalInput from '../lib/IntervalInput.svelte'
  import WindowEditor from '../lib/WindowEditor.svelte'
  import { effectiveWindows, fmtInterval, schedulableTypes } from '../lib/due'
  import { commonName } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import {
    db,
    getCareType,
    getSchedule,
    isActive,
    productList,
    setSchedule,
    setWindows,
    toWindows,
    usesProduct,
    windowRows,
  } from '../lib/store.svelte'
  import { fmtWindows, type Window } from '../lib/windows'

  let types = $derived(schedulableTypes())
  let careType = $state(schedulableTypes()[0] ?? '')
  let defaults = $derived(toWindows(windowRows(careType, '')))
  let products = $derived(usesProduct(getCareType(careType)) ? productList(careType) : '')

  // Species in the collection, plus any species that already has a schedule or windows.
  let species = $derived.by(() => {
    const counts = new Map<string, number>()
    for (const t of db.trees) if (isActive(t) && t.species) counts.set(t.species, (counts.get(t.species) ?? 0) + 1)
    for (const s of db.schedules) if (s.species && !counts.has(s.species)) counts.set(s.species, 0)
    for (const w of db.windows) if (w.species && !counts.has(w.species)) counts.set(w.species, 0)
    return [...counts.entries()].sort((a, b) => commonName(a[0]).localeCompare(commonName(b[0])))
  })

  let busy = $state(false)
  let error = $state('')

  // Default windows sheet
  let defaultOpen = $state(false)
  let defaultDraft = $state<Window[]>([])
  function editDefaults() {
    defaultDraft = defaults
    error = ''
    defaultOpen = true
  }

  // Species sheet
  let speciesOpen = $state(false)
  let editingSpecies = $state('')
  let intervalDraft = $state('')
  let ownWindows = $state(false)
  let windowsDraft = $state<Window[]>([])
  function editSpecies(sp: string) {
    const own = toWindows(windowRows(careType, sp))
    editingSpecies = sp
    intervalDraft = getSchedule({ species: sp }, careType)?.interval_days ?? ''
    ownWindows = own.length > 0
    // Starting from the defaults makes "same as default, but stop mid-December" a small edit.
    windowsDraft = own.length ? own : defaults.map((w) => ({ ...w }))
    error = ''
    speciesOpen = true
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

  const saveDefaults = () =>
    run(
      () => setWindows(careType, '', defaultDraft.map((w) => ({ ...w, interval: null, product: '' }))),
      () => (defaultOpen = false),
    )

  const saveSpecies = () =>
    run(
      async () => {
        await setSchedule({ species: editingSpecies }, careType, intervalDraft)
        await setWindows(careType, editingSpecies, ownWindows ? windowsDraft : [])
      },
      () => (speciesOpen = false),
    )

  function summary(sp: string) {
    const base = Number(getSchedule({ species: sp }, careType)?.interval_days) || 0
    const { windows, source } = effectiveWindows(sp, careType)
    const perWindow = windows.filter((w) => w.interval)
    const interval = perWindow.length
      ? [...new Set(perWindow.map((w) => fmtInterval(w.interval!)))].join(' / ')
      : base
        ? fmtInterval(base)
        : ''
    return { interval, season: source === 'species' ? fmtWindows(windows) : '' }
  }
</script>

<button class="back" onclick={() => go('settings')}><Icon name="back" size={18} /> Settings</button>
<h1>Schedules</h1>
<p class="intro">
  Set how often each species needs care and when. Species follow the default season unless they have their own windows. Trees use their species'
  schedule unless you override the interval on the tree's page.
</p>

{#if types.length === 0}
  <p class="intro">No care types are schedulable. Turn scheduling on in <button class="link" onclick={() => go('settings', 'care-types')}>Care types</button>.</p>
{:else}
  <div class="chips">
    {#each types as t (t)}
      <button class:on={careType === t} onclick={() => (careType = t)}>{t}</button>
    {/each}
  </div>

  <button class="row season" onclick={editDefaults}>
    <span>
      <span class="label">Default season</span>
      <span class="sval">{fmtWindows(defaults)}</span>
    </span>
    <span class="edit">Edit</span>
  </button>

  <h2 class="label">Species</h2>
  {#if species.length === 0}
    <p class="intro">Add trees first. Their species appear here.</p>
  {:else}
    <ul>
      {#each species as [sp, count] (sp)}
        {@const s = summary(sp)}
        <li>
          <button class="row" onclick={() => editSpecies(sp)}>
            <span>
              <span class="name">{commonName(sp)}</span>
              <span class="meta">{[`${count} tree${count === 1 ? '' : 's'}`, s.season].filter(Boolean).join(' · ')}</span>
            </span>
            <span class="val" class:none={!s.interval}>{s.interval || 'Not set'}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<BottomSheet bind:open={defaultOpen} title={`${careType} default season`} {busy}>
  <p class="intro top">When {careType.toLowerCase()} can be due for species without their own windows.</p>
  {#key defaultOpen}<WindowEditor bind:value={defaultDraft} />{/key}
  <div class="form-actions">
    {#if error}<p class="form-error">{error}</p>{/if}
    <button class="btn" onclick={saveDefaults} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
  </div>
</BottomSheet>

<BottomSheet bind:open={speciesOpen} title={`${commonName(editingSpecies)} · ${careType}`} {busy}>
  <div class="field">
    <span class="label">Base interval</span>
    {#key editingSpecies + careType + speciesOpen}<IntervalInput bind:value={intervalDraft} />{/key}
    <span class="help">Used whenever a window doesn't set its own.</span>
  </div>

  <label class="toggle">
    <input type="checkbox" bind:checked={ownWindows} />
    <span>Own windows <span class="muted">· default: {fmtWindows(defaults)}</span></span>
  </label>
  {#if ownWindows}
    <div class="windows">
      {#key editingSpecies + careType + speciesOpen}<WindowEditor bind:value={windowsDraft} withInterval productList={products} />{/key}
    </div>
    {#if products}<p class="help">Window products apply to standard trees. Phosphorus-sensitive trees always get your P-safe fertiliser.</p>{/if}
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
  .intro.top {
    margin: 0 0 16px;
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
    text-align: right;
  }
  .sval {
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
  .help {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.45;
  }
  p.help {
    margin: 10px 0 0;
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
  .windows {
    margin-top: 14px;
  }
</style>
