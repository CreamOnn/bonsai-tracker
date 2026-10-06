<script lang="ts">
  import BottomSheet from '../lib/BottomSheet.svelte'
  import DriveImage from '../lib/DriveImage.svelte'
  import Icon from '../lib/Icon.svelte'
  import InkTree from '../lib/InkTree.svelte'
  import { ensureFreshToken } from '../lib/auth'
  import { commonName, fmtAge, fmtDate, fmtMoney, latinName } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { coverFor, getTree, isActive, photosFor, restoreTree, setCover } from '../lib/store.svelte'
  import ArchiveForm from './ArchiveForm.svelte'
  import PhotoForm from './PhotoForm.svelte'
  import PhotoEditForm from './PhotoEditForm.svelte'
  import type { Row } from '../lib/store.svelte'
  import TreeForm from './TreeForm.svelte'

  let { id }: { id: string } = $props()

  let tree = $derived(getTree(id))
  let photos = $derived(tree ? photosFor('tree', tree.id) : [])
  let cover = $derived(tree ? coverFor(tree) : undefined)

  let editing = $state(false)
  let archiving = $state(false)
  let pickedFile = $state<File | null>(null)
  let photoOpen = $state(false)
  let editingPhoto = $state<Row | null>(null)
  let photoEditOpen = $state(false)

  function openPhoto(p: Row) {
    ensureFreshToken()
    editingPhoto = p
    photoEditOpen = true
  }
  let busy = $state(false)
  let restoring = $state(false)
  let actionError = $state('')
  let fileInput: HTMLInputElement

  function pickPhoto() {
    ensureFreshToken()
    fileInput.value = ''
    fileInput.click()
  }

  function onFile(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!f) return
    pickedFile = f
    photoOpen = true
  }

  async function restore() {
    restoring = true
    actionError = ''
    try {
      await restoreTree(id)
    } catch (e) {
      actionError = (e as Error).message
    } finally {
      restoring = false
    }
  }

  async function makeCover(photoId: string) {
    actionError = ''
    try {
      await setCover('tree', id, photoId)
    } catch (e) {
      actionError = (e as Error).message
    }
  }

  const statusLabel: Record<string, string> = { sold: 'Sold', died: 'Died', gifted: 'Gifted' }
</script>

<input bind:this={fileInput} type="file" accept="image/*" hidden onchange={onFile} />

<button class="back" onclick={() => go('trees')}><Icon name="back" size={18} /> Trees</button>

{#if !tree}
  <p class="missing">This tree couldn't be found.</p>
{:else}
  <div class="hero" class:archived={!isActive(tree)}>
    {#if cover}
      <DriveImage fileId={cover.drive_file_id} alt={commonName(tree.species)} />
    {:else}
      <button class="first" onclick={pickPhoto}>
        <InkTree size={80} />
        <span>Add the first photo</span>
      </button>
    {/if}
  </div>

  <h1>{commonName(tree.species)}</h1>
  {#if latinName(tree.species) !== commonName(tree.species)}<p class="latin">{latinName(tree.species)}</p>{/if}

  {#if !isActive(tree)}
    <div class="archived-note">
      <span>
        {statusLabel[tree.status] ?? tree.status}
        {#if tree.status_date}· {fmtDate(tree.status_date)}{/if}
        {#if tree.sale_price}· {fmtMoney(tree.sale_price)}{/if}
      </span>
      <button onclick={restore} disabled={restoring}><Icon name="restore" size={16} /> {restoring ? 'Restoring…' : 'Restore'}</button>
    </div>
  {/if}

  <div class="actions">
    <button onclick={pickPhoto}><Icon name="camera" /><span>Photo</span></button>
    <button onclick={() => (ensureFreshToken(), (editing = true))}><Icon name="edit" /><span>Edit</span></button>
    {#if isActive(tree)}
      <button onclick={() => (ensureFreshToken(), (archiving = true))}><Icon name="archive" /><span>Archive</span></button>
    {/if}
  </div>
  {#if actionError}<p class="form-error">{actionError}</p>{/if}

  <dl>
    {#if tree.origin_year}
      <div><dt class="label">Age</dt><dd>{fmtAge(tree.origin_year)} <span class="sub">est. {tree.origin_year}</span></dd></div>
    {/if}
    {#if tree.style}<div><dt class="label">Style</dt><dd>{tree.style}</dd></div>{/if}
    {#if tree.price_paid}<div><dt class="label">Price paid</dt><dd>{fmtMoney(tree.price_paid)}</dd></div>{/if}
    {#if tree.source}<div><dt class="label">Source</dt><dd>{tree.source}</dd></div>{/if}
    {#if tree.notes}<div class="notes"><dt class="label">Notes</dt><dd>{tree.notes}</dd></div>{/if}
  </dl>

  <section>
    <h2 class="label">Photos · {photos.length}</h2>
    {#if photos.length === 0}
      <p class="sub">No photos yet.</p>
    {:else}
      <ol class="timeline">
        {#each photos as p (p.id)}
          <li>
            <span class="dot"></span>
            <div class="when">
              <span>{fmtDate(p.date)}</span>
              {#if cover?.id === p.id}
                <span class="tag">Cover</span>
              {:else}
                <button class="setcover" onclick={() => makeCover(p.id)}>Set as cover</button>
              {/if}
            </div>
            <button class="shot" onclick={() => openPhoto(p)} aria-label="Edit or delete photo">
              <DriveImage fileId={p.thumb_file_id || p.drive_file_id} alt={p.caption} />
            </button>
            {#if p.caption}<p class="caption">{p.caption}</p>{/if}
          </li>
        {/each}
      </ol>
    {/if}
  </section>

  <BottomSheet bind:open={editing} title="Edit tree" {busy}>
    <TreeForm {tree} bind:busy onsaved={() => (editing = false)} />
  </BottomSheet>

  <BottomSheet bind:open={archiving} title="Archive tree" {busy}>
    <ArchiveForm kind="tree" id={tree.id} bind:busy ondone={() => (archiving = false)} />
  </BottomSheet>

  <BottomSheet bind:open={photoEditOpen} title="Photo" {busy}>
    {#if editingPhoto}
      {#key editingPhoto.id}
        <PhotoEditForm photo={editingPhoto} isCover={cover?.id === editingPhoto.id} bind:busy ondone={() => (photoEditOpen = false)} />
      {/key}
    {/if}
  </BottomSheet>

  <BottomSheet bind:open={photoOpen} title="Add photo" {busy}>
    {#if pickedFile}
      {#key pickedFile}
        <PhotoForm file={pickedFile} ownerType="tree" ownerId={tree.id} defaultCover={!cover} bind:busy ondone={() => (photoOpen = false)} />
      {/key}
    {/if}
  </BottomSheet>
{/if}

<style>
  .missing {
    color: var(--muted);
  }
  .hero {
    margin: 0 calc(-1 * var(--gutter)) 24px;
    aspect-ratio: 4 / 5;
    max-height: 62dvh;
    width: calc(100% + 2 * var(--gutter));
    overflow: hidden;
    background: var(--surface);
  }
  @media (min-width: 640px) {
    .hero {
      margin: 0 0 24px;
      width: 100%;
      border-radius: var(--radius);
    }
  }
  .hero.archived {
    filter: grayscale(1);
    opacity: 0.6;
  }
  .first {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--muted);
    font-size: 15px;
  }
  h1 {
    font-size: 34px;
  }
  .latin {
    margin: 6px 0 0;
    color: var(--muted);
    font-style: italic;
    font-size: 15px;
  }
  .archived-note {
    margin-top: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--surface);
    border: 1px solid var(--line);
    font-size: 14px;
  }
  .archived-note button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin: 24px 0 8px;
  }
  .actions button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 0;
    border: 1px solid var(--line);
    border-radius: 14px;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .actions button:active {
    background: var(--press);
  }
  dl {
    margin: 24px 0 0;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 15px 0;
    border-bottom: 1px solid var(--line);
  }
  dl div.notes {
    flex-direction: column;
    gap: 8px;
  }
  dd {
    margin: 0;
    text-align: right;
    font-size: 16px;
  }
  .notes dd {
    text-align: left;
    white-space: pre-wrap;
    line-height: 1.5;
    color: var(--ink-soft);
  }
  .sub {
    color: var(--muted);
    font-size: 13px;
  }
  section {
    margin-top: 40px;
  }
  section h2 {
    margin-bottom: 18px;
  }
  .timeline {
    list-style: none;
    margin: 0;
    padding: 0 0 0 22px;
    border-left: 1px solid var(--line);
  }
  .timeline li {
    position: relative;
    padding-bottom: 30px;
  }
  .dot {
    position: absolute;
    left: -26.5px;
    top: 5px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ink);
  }
  .when {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 500;
  }
  .tag {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .setcover {
    font-size: 13px;
    color: var(--muted);
  }
  .shot {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.15s ease;
  }
  .shot:active {
    transform: scale(0.99);
  }
  .caption {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--ink-soft);
    line-height: 1.45;
  }
</style>
