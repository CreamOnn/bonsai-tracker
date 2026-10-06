<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import { todayISO } from '../lib/format'
  import { exifDate } from '../lib/photos'
  import { addPhoto } from '../lib/store.svelte'

  let {
    file,
    ownerType,
    ownerId,
    defaultCover,
    ondone,
    busy = $bindable(false),
  }: {
    file: File
    ownerType: 'tree' | 'pot'
    ownerId: string
    defaultCover: boolean
    ondone: () => void
    busy?: boolean
  } = $props()

  // The parent re-creates this form per file ({#key}), so initial values are enough.
  const initialFile = untrack(() => file)
  const preview = URL.createObjectURL(initialFile)
  onDestroy(() => URL.revokeObjectURL(preview))

  let date = $state(todayISO())
  let fromPhoto = $state(false)
  let caption = $state('')
  let makeCover = $state(untrack(() => defaultCover))
  let error = $state('')

  exifDate(initialFile).then((d) => {
    if (d && d <= todayISO()) {
      date = d
      fromPhoto = true
    }
  })

  async function save() {
    busy = true
    error = ''
    try {
      await addPhoto({ ownerType, ownerId, file, date, caption, makeCover })
      ondone()
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

<div class="preview"><img src={preview} alt="Selected" /></div>

<label class="field">
  <span class="label">Date{fromPhoto ? ' · from photo' : ''}</span>
  <input type="date" bind:value={date} max={todayISO()} />
</label>

<label class="field">
  <span class="label">Caption · optional</span>
  <input bind:value={caption} placeholder="After spring pruning…" />
</label>

<label class="toggle">
  <input type="checkbox" bind:checked={makeCover} />
  <span>Use as cover photo</span>
</label>

<div class="form-actions">
  {#if error}<p class="form-error">{error}</p>{/if}
  <button class="btn" onclick={save} disabled={busy || !date}>{busy ? 'Uploading…' : 'Save photo'}</button>
</div>

<style>
  .preview {
    aspect-ratio: 4 / 3;
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--line);
    margin-bottom: 22px;
  }
  .preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 22px;
    font-size: 16px;
  }
  .toggle input {
    width: 22px;
    height: 22px;
    padding: 0;
    border-radius: 6px;
    flex: none;
    display: grid;
    place-items: center;
  }
  .toggle input:checked {
    background: var(--ink);
    border-color: var(--ink);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='10' fill='none' stroke='%23f6f3ee' stroke-width='2'%3E%3Cpath d='M1 5l3.5 3.5L11 1.5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
  }
</style>
