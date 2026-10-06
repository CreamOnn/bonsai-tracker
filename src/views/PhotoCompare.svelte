<script lang="ts">
  // Side-by-side before/after of two photos (SPEC §7), older on the left.
  import DriveImage from '../lib/DriveImage.svelte'
  import { daysBetween } from '../lib/due'
  import { fmtDate } from '../lib/format'
  import type { Row } from '../lib/store.svelte'

  let { photos }: { photos: [Row, Row] } = $props()

  let pair = $derived([...photos].sort((a, b) => a.date.localeCompare(b.date)) as [Row, Row])

  /** "2 years 3 months apart", "5 months apart", "12 days apart" */
  let gap = $derived.by(() => {
    const days = daysBetween(pair[0].date, pair[1].date)
    if (days === 0) return 'Same day'
    if (days < 45) return `${days} day${days === 1 ? '' : 's'} apart`
    const months = Math.round(days / 30.44)
    const y = Math.floor(months / 12)
    const m = months % 12
    const parts = [y ? `${y} year${y === 1 ? '' : 's'}` : '', m ? `${m} month${m === 1 ? '' : 's'}` : ''].filter(Boolean)
    return `${parts.join(' ')} apart`
  })
</script>

<p class="gap">{gap}</p>
<div class="pair">
  {#each pair as p, i (p.id)}
    <figure>
      <div class="img"><DriveImage fileId={p.drive_file_id} alt={p.caption || (i === 0 ? 'Before' : 'After')} fit="contain" /></div>
      <figcaption>
        <span class="label">{i === 0 ? 'Before' : 'After'}</span>
        <span class="date">{fmtDate(p.date)}</span>
        {#if p.caption}<span class="cap">{p.caption}</span>{/if}
      </figcaption>
    </figure>
  {/each}
</div>

<style>
  .gap {
    margin: 0 0 14px;
    text-align: center;
    font-family: var(--display);
    font-size: 18px;
    font-weight: 300;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  figure {
    margin: 0;
  }
  .img {
    aspect-ratio: 3 / 4;
    border-radius: 12px;
    overflow: hidden;
    background: var(--line);
  }
  .img :global(.frame) {
    background: var(--surface);
  }
  figcaption {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 8px;
  }
  .date {
    font-size: 15px;
  }
  .cap {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.4;
  }
</style>
