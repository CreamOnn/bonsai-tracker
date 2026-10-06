<script lang="ts">
  // Month calendar of a tree's care (SPEC §7): letter codes on each day, a year/month strip to jump
  // around (including the same month last year), swipe or arrows between months, tap a day for detail.
  import { fmtDate } from './format'
  import { careCodes, type Row } from './store.svelte'

  let { entries, onentry }: { entries: Row[]; onentry: (c: Row) => void } = $props()

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const now = new Date()
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate())

  let year = $state(now.getFullYear())
  let month = $state(now.getMonth()) // 0–11
  let selected = $state<string | null>(null)

  function iso(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  let codes = $derived(careCodes())
  let byDay = $derived.by(() => {
    const m = new Map<string, Row[]>()
    for (const c of entries) m.set(c.date, [...(m.get(c.date) ?? []), c])
    return m
  })
  let monthsWithCare = $derived(new Set(entries.filter((c) => c.date.startsWith(`${year}-`)).map((c) => Number(c.date.slice(5, 7)) - 1)))

  let cells = $derived.by(() => {
    const first = new Date(year, month, 1)
    const lead = (first.getDay() + 6) % 7 // Monday first
    const days = new Date(year, month + 1, 0).getDate()
    const out: ({ day: number; iso: string; codes: string[] } | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= days; d++) {
      const key = iso(year, month, d)
      const types = [...new Set((byDay.get(key) ?? []).map((c) => c.care_type))]
      out.push({ day: d, iso: key, codes: types.map((t) => codes.get(t) ?? '?') })
    }
    return out
  })

  let legend = $derived.by(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const types = [...new Set(entries.filter((c) => c.date.startsWith(prefix)).map((c) => c.care_type))].sort()
    return types.map((t) => ({ code: codes.get(t) ?? '?', name: t }))
  })

  let dayEntries = $derived(selected ? (byDay.get(selected) ?? []) : [])

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1)
    year = d.getFullYear()
    month = d.getMonth()
    selected = null
  }

  function jump(m: number) {
    month = m
    selected = null
  }

  // Swipe left/right to change month.
  let startX = 0
  let startY = 0
  function touchstart(e: TouchEvent) {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
  }
  function touchend(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - startX
    const dy = e.changedTouches[0].clientY - startY
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1)
  }
</script>

<div class="cal">
  <div class="yearbar">
    <button onclick={() => (year -= 1)} aria-label="Previous year">‹</button>
    <span>{year}</span>
    <button onclick={() => (year += 1)} disabled={year >= now.getFullYear()} aria-label="Next year">›</button>
  </div>
  <div class="strip" role="tablist" aria-label="Months">
    {#each MONTHS as m, i (m)}
      <button role="tab" aria-selected={i === month} class:on={i === month} class:has={monthsWithCare.has(i)} onclick={() => jump(i)}>
        {m[0]}<span class="mdot" aria-hidden="true"></span>
      </button>
    {/each}
  </div>

  <div class="head">
    <button onclick={() => shift(-1)} aria-label="Previous month">‹</button>
    <span class="title">{MONTHS[month]} {year}</span>
    <button onclick={() => shift(1)} aria-label="Next month">›</button>
  </div>

  <div class="grid" role="grid" aria-label={`${MONTHS[month]} ${year}`} tabindex="-1" ontouchstart={touchstart} ontouchend={touchend}>
    {#each WEEKDAYS as w, i (i)}<span class="wd">{w}</span>{/each}
    {#each cells as c, i (i)}
      {#if c}
        <button
          class="day"
          class:today={c.iso === todayIso}
          class:sel={c.iso === selected}
          class:any={c.codes.length > 0}
          onclick={() => (selected = selected === c.iso ? null : c.iso)}
          aria-label={`${c.day} ${MONTHS[month]}${c.codes.length ? `, ${c.codes.length} care type${c.codes.length === 1 ? '' : 's'}` : ''}`}
        >
          <span class="num">{c.day}</span>
          <span class="codes">{c.codes.slice(0, 2).join(' ')}{c.codes.length > 2 ? ' +' : ''}</span>
        </button>
      {:else}
        <span></span>
      {/if}
    {/each}
  </div>

  {#if selected}
    <div class="detail">
      <p class="label">{fmtDate(selected)}</p>
      {#if dayEntries.length === 0}
        <p class="none">Nothing logged.</p>
      {:else}
        <ul>
          {#each dayEntries as c (c.id)}
            <li>
              <button onclick={() => onentry(c)}>
                <span class="code">{codes.get(c.care_type) ?? '?'}</span>
                <span class="body">
                  <span>{c.care_type}</span>
                  {#if c.product || c.amount || c.notes}<span class="meta">{[c.product, c.amount, c.notes].filter(Boolean).join(' · ')}</span>{/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  {#if legend.length}
    <p class="legend">
      {#each legend as l, i (l.name)}<span><strong>{l.code}</strong> {l.name}</span>{i < legend.length - 1 ? ' · ' : ''}{/each}
    </p>
  {/if}
</div>

<style>
  .cal {
    margin-top: 10px;
  }
  .yearbar,
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .yearbar {
    font-size: 13px;
    color: var(--muted);
  }
  .yearbar button,
  .head button {
    width: 36px;
    height: 36px;
    font-size: 20px;
    color: var(--ink-soft);
  }
  .yearbar button:disabled {
    opacity: 0.25;
  }
  .strip {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 2px;
    margin: 2px 0 14px;
  }
  .strip button {
    position: relative;
    height: 32px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--muted);
  }
  .strip button.on {
    background: var(--ink);
    color: var(--bg);
  }
  .mdot {
    position: absolute;
    left: 50%;
    bottom: 3px;
    width: 3px;
    height: 3px;
    margin-left: -1.5px;
    border-radius: 50%;
  }
  .strip button.has .mdot {
    background: currentColor;
  }
  .title {
    font-family: var(--display);
    font-size: 20px;
    font-weight: 300;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
    margin-top: 6px;
    touch-action: pan-y;
  }
  .wd {
    text-align: center;
    font-size: 11px;
    color: var(--muted);
    padding-bottom: 4px;
  }
  .day {
    aspect-ratio: 1 / 1.05;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 2px;
    padding-top: 6px;
    border-radius: 10px;
    border: 1px solid transparent;
  }
  .day.any {
    background: var(--surface);
    border-color: var(--line);
  }
  .day.today .num {
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .day.sel {
    border-color: var(--ink);
  }
  .num {
    font-size: 14px;
  }
  .codes {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--ink-soft);
    white-space: nowrap;
  }
  .detail {
    margin-top: 16px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .detail .label {
    margin: 0 0 8px;
  }
  .none {
    margin: 0;
    font-size: 14px;
    color: var(--muted);
  }
  .detail ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .detail li button {
    width: 100%;
    display: flex;
    gap: 12px;
    align-items: baseline;
    padding: 8px 0;
    text-align: left;
  }
  .code {
    flex: none;
    width: 26px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 15px;
  }
  .meta {
    font-size: 13px;
    color: var(--muted);
  }
  .legend {
    margin: 14px 0 0;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.6;
  }
  .legend strong {
    color: var(--ink-soft);
    font-weight: 600;
  }
</style>
