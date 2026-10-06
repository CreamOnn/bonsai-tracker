<script lang="ts">
  import { untrack } from 'svelte'
  import DriveImage from '../lib/DriveImage.svelte'
  import { todayISO } from '../lib/format'
  import { deletePhoto, updatePhoto, type Row } from '../lib/store.svelte'

  let { photo, ondone, busy = $bindable(false) }: { photo: Row; ondone: () => void; busy?: boolean } = $props()

  const start = untrack(() => photo)
  let date = $state(start.date)
  let caption = $state(start.caption)
  let confirming = $state(false)
  let error = $state('')

  async function run(fn: () => Promise<void>) {
    busy = true
    error = ''
    try {
      await fn()
      ondone()
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  const save = () => run(() => updatePhoto(start.id, { date, caption }))
  const remove = () => run(() => deletePhoto(start.id))
</script>

<div class="preview"><DriveImage fileId={start.thumb_file_id || start.drive_file_id} alt={start.caption} /></div>

<label class="field">
  <span class="label">Date</span>
  <input type="date" bind:value={date} max={todayISO()} />
</label>

<label class="field">
  <span class="label">Caption · optional</span>
  <input bind:value={caption} placeholder="After spring pruning…" />
</label>

<div class="form-actions">
  {#if error}<p class="form-error">{error}</p>{/if}
  {#if confirming}
    <p class="confirm">Delete this photo? It moves to your Google Drive bin, where you can recover it for 30 days.</p>
    <button class="btn danger" onclick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete photo'}</button>
    <button class="btn ghost" onclick={() => (confirming = false)} disabled={busy}>Keep it</button>
  {:else}
    <button class="btn" onclick={save} disabled={busy || !date}>{busy ? 'Saving…' : 'Save changes'}</button>
    <button class="btn ghost del" onclick={() => (confirming = true)} disabled={busy}>Delete photo</button>
  {/if}
</div>

<style>
  .preview {
    aspect-ratio: 4 / 3;
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 22px;
  }
  .confirm {
    margin: 0 0 4px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .danger {
    background: var(--danger);
  }
  .del {
    color: var(--danger);
  }
</style>
