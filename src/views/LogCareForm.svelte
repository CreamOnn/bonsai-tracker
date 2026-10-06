<script lang="ts">
  // Logs one care type for one tree (opened from a tree) or many (a round, all active trees pre-ticked).
  // For care types that record a product, the chosen trees are grouped by the product they should get:
  //   P-sensitive trees (Fertilise only) → the P-safe default (SPEC §6a)
  //   otherwise → the product of the seasonal window covering the date (SPEC §6b), else the standard default.
  import { untrack } from 'svelte'
  import DriveImage from '../lib/DriveImage.svelte'
  import ListSelect from '../lib/ListSelect.svelte'
  import { dueFor } from '../lib/due'
  import { go } from '../lib/router.svelte'
  import { commonName, fmtAge, todayISO } from '../lib/format'
  import {
    FERTILISE,
    coverFor,
    db,
    fertDefaults,
    getCareType,
    isActive,
    isPSensitive,
    lastAmount,
    logCare,
    productList,
    saveCareType,
    ui,
    usesProduct,
    type Row,
  } from '../lib/store.svelte'

  let { ondone, busy = $bindable(false) }: { ondone: () => void; busy?: boolean } = $props()

  type ProductState = { product: string; amount: string; touched: boolean }

  const presetTree = untrack(() => ui.logCareTree)
  const activeTrees = untrack(() => db.trees.filter(isActive))

  let careType = $state(untrack(() => ui.logCareType) || '')
  let date = $state(todayISO())
  let selected = $state<Set<string>>(new Set(presetTree ? [presetTree] : activeTrees.map((t) => t.id)))
  let showTrees = $state(!presetTree)
  let notes = $state('')
  let error = $state('')
  // Keyed by group: 'p' (P-sensitive) or 'w:<window product>' ('w:' = no window product).
  let prod = $state<Record<string, ProductState>>({})

  // Inline "new care type"
  let addingType = $state(false)
  let newName = $state('')
  let newSchedulable = $state(false)
  let newUsesProduct = $state(false)

  let ct = $derived(getCareType(careType))
  let showProduct = $derived(usesProduct(ct))
  let isFert = $derived(careType === FERTILISE)
  let presetName = $derived(presetTree ? commonName(db.trees.find((t) => t.id === presetTree)?.species ?? '') : '')
  let chosen = $derived(activeTrees.filter((t) => selected.has(t.id)))

  function groupKey(t: Row) {
    if (isFert && isPSensitive(t)) return 'p'
    return `w:${dueFor(t, careType, date).product}`
  }

  // 'p' first, then the plain standard group, then seasonal-product groups.
  let groups = $derived.by(() => {
    const m = new Map<string, Row[]>()
    for (const t of chosen) {
      const k = groupKey(t)
      m.set(k, [...(m.get(k) ?? []), t])
    }
    const rank = (k: string) => (k === 'p' ? 0 : k === 'w:' ? 1 : 2)
    return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
  })

  function defaultsFor(key: string) {
    if (key === 'p') return fertDefaults('p')
    if (key === 'w:') return isFert ? fertDefaults('std') : { product: '', amount: '' }
    return { product: key.slice(2), amount: '' }
  }

  /** The group's default amount when its default product is chosen, otherwise the last amount used. */
  function amountFor(key: string, product: string) {
    if (!product) return ''
    const d = defaultsFor(key)
    if (d.product === product && d.amount) return d.amount
    return lastAmount(careType, product)
  }

  // Each group gets its default product the first time it appears.
  $effect(() => {
    for (const [key] of groups) {
      if (untrack(() => prod[key])) continue
      const product = untrack(() => defaultsFor(key).product)
      prod[key] = { product, amount: untrack(() => amountFor(key, product)), touched: false }
    }
  })

  // Changing a product refreshes its amount, unless the user typed one.
  $effect(() => {
    for (const key of Object.keys(prod)) {
      const s = prod[key]
      const product = s.product
      if (!untrack(() => s.touched)) s.amount = untrack(() => amountFor(key, product))
    }
  })

  let pDefault = $derived(fertDefaults('p'))
  let pWarning = $derived(isFert && !!pDefault.product && !!prod.p?.product && prod.p.product !== pDefault.product)

  function title(key: string, count: number) {
    const n = `${count} tree${count === 1 ? '' : 's'}`
    if (key === 'p') return `Phosphorus-sensitive · ${n}`
    if (key === 'w:') return `${isFert ? 'Standard' : 'Trees'} · ${n}`
    return `Seasonal: ${key.slice(2)} · ${n}`
  }

  // A single group with nothing special about it needs no box.
  let plain = $derived(groups.length === 1 && groups[0][0] === 'w:' && !isFert)

  // Product lists are per care type, so switching type resets the products.
  function pickType(e: Event) {
    const v = (e.currentTarget as HTMLSelectElement).value
    if (v === '__new__') {
      ;(e.currentTarget as HTMLSelectElement).value = careType
      addingType = true
      newName = ''
      newSchedulable = false
      newUsesProduct = false
      return
    }
    careType = v
    prod = {}
  }

  async function createType() {
    busy = true
    error = ''
    try {
      const created = await saveCareType({ name: newName, schedulable: newSchedulable, usesProduct: newUsesProduct })
      careType = created.name
      prod = {}
      addingType = false
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selected = next
  }

  async function save() {
    if (!careType || selected.size === 0) return
    busy = true
    error = ''
    try {
      await logCare({
        careType,
        date,
        notes,
        items: chosen.map((t) => {
          const s = prod[groupKey(t)]
          return { treeId: t.id, product: showProduct ? (s?.product ?? '') : '', amount: showProduct ? (s?.amount ?? '') : '' }
        }),
      })
      ondone()
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

{#snippet productFields(key: string, heading: string)}
  {#if prod[key]}
    <div class:groupbox={!plain}>
      {#if !plain}<p class="grouptitle">{heading}</p>{/if}
      <ListSelect label="Product" list={productList(careType)} bind:value={prod[key].product} />
      <label class="field">
        <span class="label">Amount · optional</span>
        <input bind:value={prod[key].amount} oninput={() => (prod[key].touched = true)} placeholder="e.g. 5 ml/L" />
      </label>
      {#if key === 'p' && pWarning}
        <p class="warn">This isn't your phosphorus-safe fertiliser ({pDefault.product}).</p>
      {:else if key === 'p' && !pDefault.product}
        <p class="hint small">Set your phosphorus-safe fertiliser in <button class="link" onclick={() => go('settings', 'fertilisers')}>Settings → Fertilisers</button>.</p>
      {/if}
    </div>
  {/if}
{/snippet}

{#if addingType}
  <div class="newtype">
    <label class="field">
      <span class="label">New care type</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:value={newName} placeholder="e.g. Root prune" autofocus />
    </label>
    <label class="toggle"><input type="checkbox" bind:checked={newSchedulable} /><span>Can be scheduled</span></label>
    <label class="toggle"><input type="checkbox" bind:checked={newUsesProduct} /><span>Record product + amount</span></label>
    <div class="btns">
      <button class="btn" onclick={createType} disabled={busy || !newName.trim()}>{busy ? 'Adding…' : 'Add type'}</button>
      <button class="btn ghost" onclick={() => (addingType = false)} disabled={busy}>Cancel</button>
    </div>
  </div>
{:else}
  <div class="field">
    <span class="label">Care</span>
    <select value={careType} onchange={pickType} class:placeholder={!careType}>
      <option value="" disabled>Choose…</option>
      {#each db.careTypes as c (c.name)}<option value={c.name}>{c.name}</option>{/each}
      <option value="__new__">＋ New care type…</option>
    </select>
  </div>
{/if}

<label class="field">
  <span class="label">Date</span>
  <input type="date" bind:value={date} max={todayISO()} />
</label>

{#if showProduct}
  {#each groups as [key, trees] (key)}{@render productFields(key, title(key, trees.length))}{/each}
{/if}

<div class="field">
  <div class="treehead">
    <span class="label">Trees · {selected.size} of {activeTrees.length}</span>
    {#if showTrees}
      <span class="bulk">
        <button onclick={() => (selected = new Set(activeTrees.map((t) => t.id)))}>All</button>
        <button onclick={() => (selected = new Set())}>None</button>
      </span>
    {/if}
  </div>
  {#if !showTrees}
    <div class="one">
      <span>{presetName}</span>
      <button onclick={() => (showTrees = true)}>Add more trees</button>
    </div>
  {:else if activeTrees.length === 0}
    <p class="hint">No active trees yet.</p>
  {:else}
    <ul class="trees">
      {#each activeTrees as t (t.id)}
        {@const cover = coverFor(t)}
        <li>
          <button class="tree" class:on={selected.has(t.id)} onclick={() => toggle(t.id)} aria-pressed={selected.has(t.id)}>
            <span class="thumb">
              {#if cover}<DriveImage fileId={cover.thumb_file_id || cover.drive_file_id} alt="" />{/if}
            </span>
            <span class="name">
              <span>{commonName(t.species) || 'Unknown'}</span>
              <span class="meta">{[isPSensitive(t) ? 'P-sensitive' : '', fmtAge(t.origin_year), t.style.replace(/\s*\(.*\)$/, '')].filter(Boolean).join(' · ')}</span>
            </span>
            <span class="check" aria-hidden="true"></span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<label class="field">
  <span class="label">Notes · optional</span>
  <textarea bind:value={notes} rows="2"></textarea>
</label>

<div class="form-actions">
  {#if error}<p class="form-error">{error}</p>{/if}
  <button class="btn" onclick={save} disabled={busy || !careType || selected.size === 0 || addingType}>
    {busy ? 'Saving…' : selected.size > 1 ? `Log for ${selected.size} trees` : 'Log care'}
  </button>
</div>

<style>
  .placeholder {
    color: var(--muted);
  }
  .groupbox {
    margin-top: 20px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .groupbox + .groupbox {
    margin-top: 12px;
  }
  .grouptitle {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 500;
  }
  .warn {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--danger);
  }
  .small {
    margin: 10px 0 0;
    font-size: 13px;
  }
  .link {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .newtype {
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
    font-size: 15px;
  }
  .toggle input,
  .check {
    width: 22px;
    height: 22px;
    padding: 0;
    flex: none;
    border-radius: 6px;
    border: 1px solid var(--line);
    background: var(--surface);
  }
  .toggle input:checked,
  .tree.on .check {
    background: var(--ink)
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='10' fill='none' stroke='%23f6f3ee' stroke-width='2'%3E%3Cpath d='M1 5l3.5 3.5L11 1.5'/%3E%3C/svg%3E")
      no-repeat center;
    border-color: var(--ink);
  }
  .btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 18px;
  }
  .btns .btn {
    height: 44px;
    font-size: 15px;
  }
  .treehead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .bulk {
    display: flex;
    gap: 14px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-soft);
  }
  .one {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 48px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    font-size: 16px;
  }
  .one button {
    font-size: 13px;
    color: var(--muted);
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
  }
  .trees {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    max-height: 300px;
    overflow-y: auto;
  }
  .trees li + li {
    border-top: 1px solid var(--line);
  }
  .tree {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    text-align: left;
  }
  .thumb {
    width: 40px;
    height: 40px;
    flex: none;
    border-radius: 8px;
    overflow: hidden;
    background: var(--line);
  }
  .name {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 15px;
  }
  .meta {
    font-size: 12px;
    color: var(--muted);
  }
</style>
