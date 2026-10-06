<script lang="ts">
  // Thin-stroke line icons, 24px grid.
  export type IconName =
    | 'home'
    | 'tree'
    | 'pot'
    | 'settings'
    | 'plus'
    | 'care'
    | 'external'
    | 'back'
    | 'search'
    | 'camera'
    | 'edit'
    | 'archive'
    | 'restore'
  let { name, size = 24 }: { name: IconName; size?: number } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'home'}
    <path d="M4 10.5 12 4l8 6.5V20H4z" /><path d="M10 20v-5h4v5" />
  {:else if name === 'tree'}
    <path d="M12 20v-6c0-2-2-3-1-6" /><path d="M7 9c1.5-2.5 6.5-2.5 8 0" /><path d="M11 13c2-1 5-.5 7-2" /><path d="M5 20h14" />
  {:else if name === 'pot'}
    <path d="M3 9h18" /><path d="M5 9l1.5 8h11L19 9" /><path d="M7 20h10" />
  {:else if name === 'settings'}
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" />
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'care'}
    <path d="M12 21c-4-3-7-6.5-7-10a7 7 0 0 1 14 0c0 3.5-3 7-7 10z" /><path d="M12 8v6M9 11h6" />
  {:else if name === 'external'}
    <path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v6H4V6h6" />
  {:else if name === 'back'}
    <path d="M15 5l-7 7 7 7" />
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
  {:else if name === 'camera'}
    <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
  {:else if name === 'edit'}
    <path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" />
  {:else if name === 'archive'}
    <path d="M4 5h16v4H4z" /><path d="M5 9v10h14V9" /><path d="M10 13h4" />
  {:else if name === 'restore'}
    <path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v4h4" />
  {/if}
</svg>
