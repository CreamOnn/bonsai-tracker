<script lang="ts">
  import InkTree from '../lib/InkTree.svelte'
  let { onstart, error = '' }: { onstart: () => void; error?: string } = $props()
</script>

<main>
  <div class="mark"><InkTree size={150} /></div>
  <h1>Bonsai Tracker</h1>
  <p class="sub">Trees, pots and the care between.</p>
  <div class="foot">
    {#if error}<p class="err">{error}</p>{/if}
    <button class="btn" onclick={onstart}>Continue with Google</button>
    <p class="note">Your data stays in your own Google Drive.</p>
  </div>
</main>

<style>
  main {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: calc(var(--safe-top) + 18vh) var(--gutter) calc(var(--safe-bottom) + 32px);
    text-align: center;
  }
  .mark {
    margin-bottom: 36px;
    animation: rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }
  h1 {
    font-size: 34px;
  }
  .sub {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 15px;
  }
  .foot {
    margin-top: auto;
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .note {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .err {
    margin: 0;
    color: var(--danger);
    font-size: 14px;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
</style>
