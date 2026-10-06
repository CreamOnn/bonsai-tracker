<script lang="ts">
  import Icon from '../lib/Icon.svelte'
  let { title, note, icon }: { title: string; note: string; icon: 'tree' | 'pot' } = $props()
</script>

<header>
  <h1>{title}</h1>
</header>
<div class="empty">
  <Icon name={icon} size={40} />
  <p>{note}</p>
</div>

<style>
  h1 {
    font-size: 40px;
  }
  .empty {
    margin-top: 22vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    color: var(--muted);
  }
  p {
    margin: 0;
    font-size: 15px;
  }
</style>
