<script lang="ts">
  import type { Workspace } from '../lib/drive'
  import { db, isActive } from '../lib/store.svelte'
  let { workspace }: { workspace: Workspace } = $props()

  let treeCount = $derived(db.trees.filter(isActive).length)
  let potCount = $derived(db.pots.filter(isActive).length)

  const today = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
</script>

<header>
  <p class="label">{today}</p>
  <h1>Collection</h1>
</header>

<section class="stats">
  <div class="stat">
    <span class="n">{treeCount}</span>
    <span class="label">Trees</span>
  </div>
  <div class="stat">
    <span class="n">{potCount}</span>
    <span class="label">Pots</span>
  </div>
</section>

<section>
  <h2 class="label">Due now</h2>
  <p class="empty">Nothing due.</p>
</section>

<section>
  <h2 class="label">Recent care</h2>
  <p class="empty">No care logged yet.</p>
</section>

<p class="drive">Connected to Drive as {workspace.email}</p>

<style>
  header {
    margin-bottom: 36px;
  }
  h1 {
    font-size: 40px;
    margin-top: 6px;
  }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    margin-bottom: 40px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 22px 0;
  }
  .stat + .stat {
    border-left: 1px solid var(--line);
    padding-left: 22px;
  }
  .n {
    font-family: var(--display);
    font-size: 44px;
    font-weight: 200;
    line-height: 1;
  }
  section + section {
    margin-top: 36px;
  }
  h2 {
    margin-bottom: 14px;
  }
  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 15px;
  }
  .drive {
    margin-top: 56px;
    font-size: 12px;
    color: var(--muted);
  }
</style>
