<script lang="ts">
  // Edits an interval stored in days, shown as a number + unit. '' = no schedule.
  import { untrack } from 'svelte'

  let { value = $bindable(''), placeholder = 'None' }: { value?: string; placeholder?: string } = $props()

  const UNITS = [
    { label: 'days', days: 1 },
    { label: 'weeks', days: 7 },
    { label: 'months', days: 30 },
    { label: 'years', days: 365 },
  ]

  function split(v: string) {
    const d = Number(v)
    if (!d) return { n: '', unit: 1 }
    const u = [...UNITS].reverse().find((u) => d % u.days === 0) ?? UNITS[0]
    return { n: String(d / u.days), unit: u.days }
  }

  const start = split(untrack(() => value))
  let n = $state(start.n)
  let unit = $state(start.unit)

  function commit() {
    const num = Math.round(Number(String(n).replace(/[^\d.]/g, '')))
    value = num > 0 ? String(num * unit) : ''
  }
</script>

<div class="interval">
  <input bind:value={n} inputmode="numeric" {placeholder} oninput={commit} aria-label="Interval" />
  <select bind:value={unit} onchange={commit} aria-label="Unit">
    {#each UNITS as u (u.days)}<option value={u.days}>{u.label}</option>{/each}
  </select>
</div>

<style>
  .interval {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 8px;
  }
</style>
