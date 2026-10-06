<script lang="ts">
  import type { Workspace } from '../lib/drive'
  import Icon from '../lib/Icon.svelte'
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
  <h2 class="label">Collection</h2>
  <p class="soon">Lists, care types and schedules arrive in a later build.</p>
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
  .soon {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 14px;
  }
  .out {
    margin-top: 48px;
    width: 100%;
  }
</style>
