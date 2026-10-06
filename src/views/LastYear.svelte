<script lang="ts">
  // "This week last year" (SPEC §7): care within ±7 days of today's date one year ago. Display only.
  import { addDays } from '../lib/due'
  import { todayISO } from '../lib/format'
  import { careFor } from '../lib/store.svelte'

  let { treeId }: { treeId: string } = $props()

  const today = todayISO()
  const centre = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`.replace('-02-29', '-02-28')
  const from = addDays(centre, -7)
  const to = addDays(centre, 7)

  let hits = $derived(careFor(treeId).filter((c) => c.date >= from && c.date <= to))
  let types = $derived([...new Set([...hits].reverse().map((c) => c.care_type))])

  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  let span = $derived.by(() => {
    if (!hits.length) return ''
    const dates = hits.map((c) => c.date).sort()
    const first = dates[0]
    const last = dates[dates.length - 1]
    const year = first.slice(0, 4)
    return first === last ? `${fmt(first)} ${year}` : `${fmt(first)} – ${fmt(last)} ${year}`
  })
</script>

{#if hits.length}
  <aside>
    <p class="label">This week last year</p>
    <p class="what">{types.join(', ')}</p>
    <p class="when">{span}</p>
  </aside>
{/if}

<style>
  aside {
    margin-top: 28px;
    padding: 16px 18px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--line);
  }
  .label {
    margin: 0;
  }
  .what {
    margin: 8px 0 0;
    font-family: var(--display);
    font-size: 20px;
    font-weight: 300;
  }
  .when {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
</style>
