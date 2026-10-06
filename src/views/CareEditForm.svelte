<script lang="ts">
  import { untrack } from 'svelte'
  import ListSelect from '../lib/ListSelect.svelte'
  import { todayISO } from '../lib/format'
  import {
    FERTILISE,
    deleteCare,
    fertDefaults,
    getCareType,
    getTree,
    isPSensitive,
    productList,
    updateCare,
    usesProduct,
    type Row,
  } from '../lib/store.svelte'

  let { entry, ondone, busy = $bindable(false) }: { entry: Row; ondone: () => void; busy?: boolean } = $props()

  const start = untrack(() => entry)
  const showProduct = usesProduct(getCareType(start.care_type)) || !!start.product
  let date = $state(start.date)
  let product = $state(start.product)
  let amount = $state(start.amount)
  let notes = $state(start.notes)
  let confirming = $state(false)
  let error = $state('')

  const tree = getTree(start.tree_id)
  const pSafe = fertDefaults('p').product
  let pWarning = $derived(start.care_type === FERTILISE && !!tree && isPSensitive(tree) && !!pSafe && !!product && product !== pSafe)

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
</script>

<p class="type">{start.care_type}</p>
{#if start.round_id}<p class="round">Logged as part of a round. Changes apply to this tree only.</p>{/if}

<label class="field">
  <span class="label">Date</span>
  <input type="date" bind:value={date} max={todayISO()} />
</label>

{#if showProduct}
  <ListSelect label="Product" list={productList(start.care_type)} bind:value={product} />
  <label class="field">
    <span class="label">Amount · optional</span>
    <input bind:value={amount} placeholder="e.g. 5 ml/L" />
  </label>
  {#if pWarning}<p class="warn">This tree is phosphorus-sensitive. Your phosphorus-safe fertiliser is {pSafe}.</p>{/if}
{/if}

<label class="field">
  <span class="label">Notes · optional</span>
  <textarea bind:value={notes} rows="2"></textarea>
</label>

<div class="form-actions">
  {#if error}<p class="form-error">{error}</p>{/if}
  {#if confirming}
    <p class="confirm">Delete this care entry? This can't be undone.</p>
    <button class="btn danger" onclick={() => run(() => deleteCare(start.id))} disabled={busy}>{busy ? 'Deleting…' : 'Delete entry'}</button>
    <button class="btn ghost" onclick={() => (confirming = false)} disabled={busy}>Keep it</button>
  {:else}
    <button class="btn" onclick={() => run(() => updateCare(start.id, { date, notes, product, amount }))} disabled={busy || !date}>
      {busy ? 'Saving…' : 'Save changes'}
    </button>
    <button class="btn ghost del" onclick={() => (confirming = true)} disabled={busy}>Delete entry</button>
  {/if}
</div>

<style>
  .type {
    margin: 0 0 4px;
    font-family: var(--display);
    font-size: 24px;
    font-weight: 300;
  }
  .round {
    margin: 0 0 18px;
    font-size: 13px;
    color: var(--muted);
  }
  .type + label {
    margin-top: 18px;
  }
  .warn {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--danger);
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
