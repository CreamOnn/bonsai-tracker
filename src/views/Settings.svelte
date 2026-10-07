<script lang="ts">
  import type { Workspace } from '../lib/drive'
  import Icon from '../lib/Icon.svelte'
  import { go } from '../lib/router.svelte'
  let { workspace, onsignout }: { workspace: Workspace; onsignout: () => void } = $props()
</script>

<header>
  <h1>Settings</h1>
</header>

<section>
  <h2 class="label">Account</h2>
  <div class="row">
    <span>Google</span>
    <span class="val">{workspace.email}</span>
  </div>
  <a class="row" href={workspace.sheetUrl} target="_blank" rel="noreferrer">
    <span>Open data Sheet</span>
    <Icon name="external" size={18} />
  </a>
  <a class="row" href={`https://drive.google.com/drive/folders/${workspace.folderId}`} target="_blank" rel="noreferrer">
    <span>Open Drive folder</span>
    <Icon name="external" size={18} />
  </a>
</section>

<section>
  <h2 class="label">Care</h2>
  <button class="row" onclick={() => go('settings', 'schedules')}>
    <span>Schedules</span>
    <span class="chev"><Icon name="back" size={16} /></span>
  </button>
  <button class="row" onclick={() => go('settings', 'care-types')}>
    <span>Care types</span>
    <span class="chev"><Icon name="back" size={16} /></span>
  </button>
  <button class="row" onclick={() => go('settings', 'fertilisers')}>
    <span>Fertilisers</span>
    <span class="chev"><Icon name="back" size={16} /></span>
  </button>
  <button class="row" onclick={() => go('settings', 'lists')}>
    <span>Lists <span class="sub">· species, styles, colours, products</span></span>
    <span class="chev"><Icon name="back" size={16} /></span>
  </button>
  <button class="row" onclick={() => go('settings', 'species')}>
    <span>Species <span class="sub">· phosphorus-sensitive</span></span>
    <span class="chev"><Icon name="back" size={16} /></span>
  </button>
</section>

<button class="btn ghost out" onclick={onsignout}>Sign out</button>

<style>
  h1 {
    font-size: 40px;
    margin-bottom: 36px;
  }
  h2 {
    margin-bottom: 6px;
  }
  section + section {
    margin-top: 36px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    min-height: 54px;
    border-bottom: 1px solid var(--line);
    text-decoration: none;
    font-size: 16px;
  }
  .val {
    color: var(--muted);
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sub {
    color: var(--muted);
    font-size: 13px;
  }
  button.row {
    width: 100%;
    text-align: left;
  }
  .chev {
    color: var(--muted);
    display: flex;
    transform: rotate(180deg);
  }
  .out {
    margin-top: 48px;
    width: 100%;
  }
</style>
