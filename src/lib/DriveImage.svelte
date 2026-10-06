<script lang="ts">
  import { photoUrl } from './photos'

  let { fileId, alt = '' }: { fileId: string; alt?: string } = $props()

  let src = $state<string | null>(null)
  let failed = $state(false)
  let loaded = $state(false)

  $effect(() => {
    const id = fileId
    src = null
    failed = false
    loaded = false
    if (!id) return
    let alive = true
    photoUrl(id).then(
      (u) => alive && (src = u),
      () => alive && (failed = true),
    )
    return () => {
      alive = false
    }
  })
</script>

<div class="frame" class:failed>
  {#if src}<img {src} {alt} class:loaded onload={() => (loaded = true)} />{/if}
</div>

<style>
  .frame {
    width: 100%;
    height: 100%;
    background: var(--line);
    overflow: hidden;
  }
  .failed {
    background: repeating-linear-gradient(45deg, var(--line), var(--line) 6px, var(--surface) 6px, var(--surface) 12px);
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.35s ease;
  }
  img.loaded {
    opacity: 1;
  }
</style>
