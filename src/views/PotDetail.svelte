<script lang="ts">
  import BottomSheet from '../lib/BottomSheet.svelte'
  import DriveImage from '../lib/DriveImage.svelte'
  import Icon from '../lib/Icon.svelte'
  import { ensureFreshToken } from '../lib/auth'
  import { fmtAge, fmtDate, fmtMoney, fmtSize, statusLabel } from '../lib/format'
  import { go } from '../lib/router.svelte'
  import { POT_SLOTS, coverFor, getMaker, getPot, isActive, photosFor, restoreRecord, type PotSlot, type Row } from '../lib/store.svelte'
  import ArchiveForm from './ArchiveForm.svelte'
  import PhotoEditForm from './PhotoEditForm.svelte'
  import PhotoForm from './PhotoForm.svelte'
  import PotForm from './PotForm.svelte'

  let { id }: { id: string } = $props()

  let pot = $derived(getPot(id))
  let maker = $derived(pot ? getMaker(pot.maker_id) : undefined)
  let cover = $derived(pot ? coverFor(pot, 'pot') : undefined)
  let title = $derived(maker?.name ?? (pot?.style || 'Pot'))
  let finish = $derived(
    pot ? [pot.glaze === 'glazed' ? 'Glazed' : pot.glaze === 'unglazed' ? 'Unglazed' : '', pot.glaze_colour].filter(Boolean).join(' · ') : '',
  )

  let editing = $state(false)
  let archiving = $state(false)
  let photoOpen = $state(false)
  let photoEditOpen = $state(false)
  let pickedFile = $state<File | null>(null)
  let pickedSlot = $state<PotSlot>('front')
  let editingPhoto = $state<Row | null>(null)
  let busy = $state(false)
  let restoring = $state(false)
  let actionError = $state('')
  let fileInput: HTMLInputElement

  function pickPhoto(slot: PotSlot) {
    ensureFreshToken()
    pickedSlot = slot
    fileInput.value = ''
    fileInput.click()
  }

  function onFile(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!f) return
    pickedFile = f
    photoOpen = true
  }

  function openPhoto(p: Row) {
    ensureFreshToken()
    editingPhoto = p
    photoEditOpen = true
  }

  async function restore() {
    restoring = true
    actionError = ''
    try {
      await restoreRecord('pot', id)
    } catch (e) {
      actionError = (e as Error).message
    } finally {
      restoring = false
    }
  }
</script>

<input bind:this={fileInput} type="file" accept="image/*" hidden onchange={onFile} />

<button class="back" onclick={() => go('pots')}><Icon name="back" size={18} /> Pots</button>

{#if !pot}
  <p class="missing">This pot couldn't be found.</p>
{:else}
  <div class="hero" class:archived={!isActive(pot)}>
    {#if cover}
      <DriveImage fileId={cover.drive_file_id} alt={title} />
    {:else}
      <button class="first" onclick={() => pickPhoto('front')}>
        <Icon name="pot" size={56} />
        <span>Add a front photo</span>
      </button>
    {/if}
  </div>

  <h1>{title}</h1>
  <p class="sub-title">{[maker ? pot.style : '', finish].filter(Boolean).join(' · ')}</p>

  {#if !isActive(pot)}
    <div class="archived-note">
      <span>
        {statusLabel(pot.status, 'pot')}
        {#if pot.status_date}· {fmtDate(pot.status_date)}{/if}
        {#if pot.sale_price}· {fmtMoney(pot.sale_price)}{/if}
      </span>
      <button onclick={restore} disabled={restoring}><Icon name="restore" size={16} /> {restoring ? 'Restoring…' : 'Restore'}</button>
    </div>
  {/if}

  <div class="actions">
    <button onclick={() => pickPhoto('front')}><Icon name="camera" /><span>Photo</span></button>
    <button onclick={() => (ensureFreshToken(), (editing = true))}><Icon name="edit" /><span>Edit</span></button>
    {#if isActive(pot)}
      <button onclick={() => (ensureFreshToken(), (archiving = true))}><Icon name="archive" /><span>Archive</span></button>
    {/if}
  </div>
  {#if actionError}<p class="form-error">{actionError}</p>{/if}

  <dl>
    {#if maker}
      <div>
        <dt class="label">Maker</dt>
        <dd><button class="link" onclick={() => go('makers', maker.id)}>{maker.name}{maker.country ? ` · ${maker.country}` : ''}</button></dd>
      </div>
    {/if}
    {#if maker && pot.style}<div><dt class="label">Style</dt><dd>{pot.style}</dd></div>{/if}
    {#if fmtSize(pot)}<div><dt class="label">Size</dt><dd>{fmtSize(pot)}</dd></div>{/if}
    {#if finish}<div><dt class="label">Finish</dt><dd>{finish}</dd></div>{/if}
    {#if pot.origin_year}
      <div><dt class="label">Age</dt><dd>{fmtAge(pot.origin_year)} <span class="sub">est. {pot.origin_year}</span></dd></div>
    {/if}
    {#if pot.price}<div><dt class="label">Price</dt><dd>{fmtMoney(pot.price)}</dd></div>{/if}
    {#if pot.source}<div><dt class="label">Source</dt><dd>{pot.source}</dd></div>{/if}
    {#if pot.notes}<div class="notes"><dt class="label">Notes</dt><dd>{pot.notes}</dd></div>{/if}
  </dl>

  {#each POT_SLOTS as s (s.value)}
    {@const shots = photosFor('pot', pot.id, s.value)}
    <section>
      <h2 class="label">{s.label}{shots.length ? ` · ${shots.length}` : ''}</h2>
      <div class="strip">
        <button class="add" onclick={() => pickPhoto(s.value)} aria-label={`Add ${s.label} photo`}><Icon name="plus" /></button>
        {#each shots as p (p.id)}
          <button class="thumb" onclick={() => openPhoto(p)} aria-label={`${s.label} photo, ${fmtDate(p.date)}`}>
            <DriveImage fileId={p.thumb_file_id || p.drive_file_id} alt={p.caption} />
            <span class="date">{fmtDate(p.date)}</span>
            {#if cover?.id === p.id}<span class="cov">Cover</span>{/if}
          </button>
        {/each}
      </div>
    </section>
  {/each}

  <BottomSheet bind:open={editing} title="Edit pot" {busy}>
    <PotForm {pot} bind:busy onsaved={() => (editing = false)} />
  </BottomSheet>

  <BottomSheet bind:open={archiving} title="Archive pot" {busy}>
    <ArchiveForm kind="pot" id={pot.id} bind:busy ondone={() => (archiving = false)} />
  </BottomSheet>

  <BottomSheet bind:open={photoOpen} title="Add photo" {busy}>
    {#if pickedFile}
      {#key pickedFile}
        <PhotoForm file={pickedFile} ownerType="pot" ownerId={pot.id} defaultCover={false} defaultSlot={pickedSlot} bind:busy ondone={() => (photoOpen = false)} />
      {/key}
    {/if}
  </BottomSheet>

  <BottomSheet bind:open={photoEditOpen} title="Photo" {busy}>
    {#if editingPhoto}
      {#key editingPhoto.id}
        <PhotoEditForm photo={editingPhoto} isCover={cover?.id === editingPhoto.id} bind:busy ondone={() => (photoEditOpen = false)} />
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
    width: calc(100% + 2 * var(--gutter));
    aspect-ratio: 4 / 3;
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
    gap: 14px;
    color: var(--muted);
    font-size: 15px;
  }
  h1 {
    font-size: 34px;
  }
  .sub-title {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 15px;
  }
  .sub-title:empty {
    display: none;
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
  /* Notes sit in the same label-left / value-right row as the other details. */
  dl div.notes dt {
    flex: none;
  }
  dd {
    margin: 0;
    text-align: right;
    font-size: 16px;
  }
  .notes dd {
    text-align: right;
    white-space: pre-wrap;
    line-height: 1.5;
  }
  .link {
    text-decoration: underline;
    text-decoration-color: var(--line);
    text-underline-offset: 4px;
  }
  .sub {
    color: var(--muted);
    font-size: 13px;
  }
  section {
    margin-top: 32px;
  }
  section h2 {
    margin-bottom: 12px;
  }
  .strip {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin: 0 calc(-1 * var(--gutter));
    padding: 0 var(--gutter) 4px;
    scrollbar-width: none;
  }
  .strip::-webkit-scrollbar {
    display: none;
  }
  .add,
  .thumb {
    flex: none;
    width: 112px;
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
  }
  .add {
    display: grid;
    place-items: center;
    border: 1px dashed var(--muted);
    color: var(--muted);
  }
  .thumb {
    position: relative;
  }
  .date,
  .cov {
    position: absolute;
    left: 6px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 500;
    background: rgba(246, 243, 238, 0.88);
  }
  .date {
    bottom: 6px;
  }
  .cov {
    top: 6px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
