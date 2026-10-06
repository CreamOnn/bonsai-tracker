<script lang="ts">
  // Settings → Fertilisers: the default product + amount for P-sensitive (X) and standard (Y) trees (SPEC §6a).
  import Icon from '../lib/Icon.svelte'
  import ListSelect from '../lib/ListSelect.svelte'
  import { go } from '../lib/router.svelte'
  import { FERTILISE, db, fertDefaults, isActive, isPSensitive, productList, setFertDefaults } from '../lib/store.svelte'

  const p0 = fertDefaults('p')
  const s0 = fertDefaults('std')
  let pProduct = $state(p0.product)
  let pAmount = $state(p0.amount)
  let sProduct = $state(s0.product)
  let sAmount = $state(s0.amount)
  let busy = $state(false)
  let error = $state('')
  let saved = $state(false)

  let pCount = $derived(db.trees.filter((t) => isActive(t) && isPSensitive(t)).length)
  let sCount = $derived(db.trees.filter((t) => isActive(t) && !isPSensitive(t)).length)
  let same = $derived(!!pProduct && pProduct === sProduct)

  async function save() {
    busy = true
    error = ''
    saved = false
    try {
      await setFertDefaults({ p: { product: pProduct, amount: pAmount }, std: { product: sProduct, amount: sAmount } })
      saved = true
    } catch (e) {
      error = (e as Error).message
    } finally {
      busy = false
    }
  }
</script>

<button class="back" onclick={() => go('settings')}><Icon name="back" size={18} /> Settings</button>
<h1>Fertilisers</h1>
<p class="intro">When you log Fertilise, each tree gets the right one automatically. You can still change it per entry.</p>

<section>
  <h2>Phosphorus-sensitive <span class="count">{pCount} tree{pCount === 1 ? '' : 's'}</span></h2>
  <ListSelect label="Product" list={productList(FERTILISE)} bind:value={pProduct} />
  <label class="field">
    <span class="label">Usual amount · optional</span>
    <input bind:value={pAmount} placeholder="e.g. 2 g/L" />
  </label>
</section>

<section>
  <h2>Standard <span class="count">{sCount} tree{sCount === 1 ? '' : 's'}</span></h2>
  <ListSelect label="Product" list={productList(FERTILISE)} bind:value={sProduct} />
  <label class="field">
    <span class="label">Usual amount · optional</span>
    <input bind:value={sAmount} placeholder="e.g. 5 ml/L" />
  </label>
</section>

<div class="form-actions">
  {#if same}<p class="warn">Both groups use the same product. Is that right?</p>{/if}
  {#if error}<p class="form-error">{error}</p>{/if}
  <button class="btn" onclick={save} disabled={busy}>{busy ? 'Saving…' : saved ? 'Saved' : 'Save'}</button>
  <button class="btn ghost" onclick={() => go('settings', 'species')}>Choose which species are P-sensitive</button>
</div>

<style>
  h1 {
    font-size: 40px;
  }
  .intro {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
  }
  section {
    margin-top: 28px;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  h2 {
    font-size: 20px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .count {
    font-family: var(--font);
    font-size: 13px;
    color: var(--muted);
  }
  .warn {
    margin: 0;
    font-size: 13px;
    color: var(--danger);
  }
</style>
