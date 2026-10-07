<script lang="ts">
  // Settings → Lists (SPEC §6c). With no `list`, shows the index; otherwise one list's values,
  // each with a "used by" count, plus add / rename / remove.
  import BottomSheet from '../lib/BottomSheet.svelte'
  import Icon from '../lib/Icon.svelte'
  import { go } from '../lib/router.svelte'
  import { addListValue, listUsageCount, listValues, managedLists, removeListValue, renameListValue } from '../lib/store.svelte'

  let { list = '' }: { list?: string } = $props()

  let lists = $derived(managedLists())
  let current = $derived(lists.find((l) => l.list === list))
  let values = $derived(list ? listValues(list) : [])

  let busy = $state(false)
  let error = $state('')
  let newValue = $state('')

  let open = $state(false)
  let editing = $state('')
  let renameTo = $state('')
  let confirming = $state(false)
  let usage = $derived(editing ? listUsageCount(list, editing) : 0)

  function edit(v: string) {
    editing = v
    renameTo = v
    confirming = false
    error = ''
    open = true
  }

  async function run(fn: () => Promise<unknown>, after: () => void = () => {}) {
    busy = true
    error = ''
    try {
      await fn()
      after()
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }

  const add = () => run(() => addListValue(list, newValue), () => (newValue = ''))
  const rename = () => run(() => renameListValue(list, editing, renameTo), () => (open = false))
  const remove = () => run(() => removeListValue(list, editing), () => (open = false))

  const used = (n: number) => (n ? `Used ${n}×` : 'Not used')
</script>

{#if !list}
  <button class="back" onclick={() => go('settings')}><Icon name="back" size={18} /> Settings</button>
  <h1>Lists</h1>
  <p class="intro">The choices offered in pickers. Renaming updates everything that uses a value.</p>
  <ul>
    {#each lists as l (l.list)}
      <li>
        <button class="row" onclick={() => go('settings', `list:${l.list}`)}>
          <span>{l.label}</span>
          <span class="meta">{listValues(l.list).length}</span>
        </button>
      </li>
    {/each}
  </ul>
  <p class="intro foot">Phosphorus-sensitive species are set in <button class="link" onclick={() => go('settings', 'species')}>Settings → Species</button>.</p>
{:else}
  <button class="back" onclick={() => go('settings', 'lists')}><Icon name="back" size={18} /> Lists</button>
  <h1>{current?.label ?? list}</h1>

  <div class="addrow">
    <input bind:value={newValue} placeholder="Add a new value" onkeydown={(e) => e.key === 'Enter' && newValue.trim() && add()} />
    <button class="btn" onclick={add} disabled={busy || !newValue.trim()}>Add</button>
  </div>
  {#if error && !open}<p class="form-error">{error}</p>{/if}

  {#if values.length === 0}
    <p class="intro">No values yet.</p>
  {:else}
    <ul>
      {#each values as v (v)}
        <li>
          <button class="row" onclick={() => edit(v)}>
            <span>{v}</span>
            <span class="meta">{used(listUsageCount(list, v))}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <BottomSheet bind:open title="Edit value" {busy}>
    <label class="field">
      <span class="label">Name</span>
      <input bind:value={renameTo} />
    </label>
    <p class="help">{usage ? `Renaming updates the ${usage} record${usage === 1 ? '' : 's'} that use it.` : 'Not used by any records yet.'}</p>
    <div class="form-actions">
      {#if error}<p class="form-error">{error}</p>{/if}
      {#if confirming}
        <p class="confirm">
          Remove "{editing}" from the list?{usage ? ` It's used ${usage}×. Those records keep it, but it won't be offered in pickers.` : ''}
        </p>
        <button class="btn danger" onclick={remove} disabled={busy}>{busy ? 'Removing…' : 'Remove'}</button>
        <button class="btn ghost" onclick={() => (confirming = false)} disabled={busy}>Keep it</button>
      {:else}
        <button class="btn" onclick={rename} disabled={busy || !renameTo.trim() || renameTo.trim() === editing}>
          {busy ? 'Saving…' : 'Rename'}
        </button>
        <button class="btn ghost del" onclick={() => (confirming = true)} disabled={busy}>Remove from list</button>
      {/if}
    </div>
  </BottomSheet>
{/if}

<style>
  h1 {
    font-size: 36px;
    margin-bottom: 8px;
  }
  .intro {
    margin: 0 0 18px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
  }
  .foot {
    margin-top: 18px;
  }
  .link {
    text-decoration: underline;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    font-size: 16px;
  }
  .meta {
    flex: none;
    font-size: 13px;
    color: var(--muted);
  }
  .addrow {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    margin: 14px 0 12px;
  }
  .addrow .btn {
    height: 48px;
    padding: 0 18px;
  }
  .help {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--muted);
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
