<script lang="ts">
  import { untrack } from 'svelte'
  import DriveImage from '../lib/DriveImage.svelte'
  import SlotPicker from '../lib/SlotPicker.svelte'
  import { todayISO } from '../lib/format'
  import { deletePhoto, setCover, updatePhoto, type Kind, type PotSlot, type Row } from '../lib/store.svelte'

  let {
    photo,
    isCover = false,
    ondone,
    busy = $bindable(false),
  }: { photo: Row; isCover?: boolean; ondone: () => void; busy?: boolean } = $props()

  const start = untrack(() => photo)
  const kind = start.owner_type as Kind
  let date = $state(start.date)
  let caption = $state(start.caption)
  let slot = $state<PotSlot>((start.slot as PotSlot) || 'front')
  let confirming = $state(false)
  let error = $state('')

  async function run(fn: () => Promise<unknown>) {
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

  const save = () => run(() => updatePhoto(start.id, { date, caption, slot: kind === 'pot' ? slot : undefined }))
  const remove = () => run(() => deletePhoto(start.id))
  const cover = () => run(() => setCover(kind, start.owner_id, start.id))
</script>

<div class="preview"><DriveImage fileId={start.thumb_file_id || start.drive_file_id} alt={start.caption} /></div>

{#if kind === 'pot'}
  <div class="slot"><SlotPicker bind:value={slot} /></div>
{/if}

<label class="field">
  <span class="label">Date</span>
  <input type="date" bind:value={date} max={todayISO()} />
</label>

<label class="field">
  <span class="label">Caption · optional</span>
  <input bind:value={caption} placeholder={kind === 'pot' ? 'Patina after 5 years…' : 'After spring pruning…'} />
</label>

<div class="form-actions">
  {#if error}<p class="form-error">{error}</p>{/if}
  {#if confirming}
    <p class="confirm">Delete this photo? It moves to your Google Drive bin, where you can recover it for 30 days.</p>
    <button class="btn danger" onclick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete photo'}</button>
    <button class="btn ghost" onclick={() => (confirming = false)} disabled={busy}>Keep it</button>
  {:else}
    <button class="btn" onclick={save} disabled={busy || !date}>{busy ? 'Saving…' : 'Save changes'}</button>
    {#if !isCover}<button class="btn ghost" onclick={cover} disabled={busy}>Use as cover</button>{/if}
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
  .slot {
    margin-bottom: 20px;
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
