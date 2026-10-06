<script lang="ts">
  import { onMount } from 'svelte'
  import { AuthRedirect, consumeRedirect, getToken, hasSignedInBefore, rememberEmail, signIn, signOut } from './lib/auth'
  import { ensureWorkspace, type Workspace } from './lib/drive'
  import { router } from './lib/router.svelte'
  import SignIn from './views/SignIn.svelte'
  import Home from './views/Home.svelte'
  import Placeholder from './views/Placeholder.svelte'
  import Settings from './views/Settings.svelte'
  import TabBar from './lib/TabBar.svelte'
  import Fab from './lib/Fab.svelte'

  type Phase = 'booting' | 'signed_out' | 'connecting' | 'ready' | 'error'
  let phase = $state<Phase>('booting')
  let error = $state('')
  let workspace = $state<Workspace | null>(null)

  async function connect() {
    phase = 'connecting'
    try {
      workspace = await ensureWorkspace()
      rememberEmail(workspace.email)
      phase = 'ready'
    } catch (e) {
      if (e instanceof AuthRedirect) return
      error = (e as Error).message
      phase = 'error'
    }
  }

  onMount(() => {
    try {
      const result = consumeRedirect()
      if (result === 'silent_failed') {
        phase = 'signed_out'
        return
      }
    } catch (e) {
      if (e instanceof AuthRedirect) return
      error = (e as Error).message
      phase = 'signed_out'
      return
    }

    if (getToken()) connect()
    else if (hasSignedInBefore()) {
      try {
        signIn({ silent: true })
      } catch {}
    } else phase = 'signed_out'
  })

  function start() {
    error = ''
    try {
      signIn()
    } catch {}
  }

  async function leave() {
    await signOut()
    workspace = null
    phase = 'signed_out'
  }
</script>

{#if phase === 'booting' || phase === 'connecting'}
  <main class="center">
    <div class="pulse" aria-label="Loading"></div>
    {#if phase === 'connecting'}<p class="label">Opening your collection</p>{/if}
  </main>
{:else if phase === 'signed_out'}
  <SignIn onstart={start} {error} />
{:else if phase === 'error'}
  <main class="center">
    <p class="err">{error}</p>
    <button class="btn" onclick={connect}>Try again</button>
    <button class="btn ghost" onclick={leave}>Sign out</button>
  </main>
{:else if workspace}
  <div class="shell">
    {#if router.route === 'home'}
      <Home {workspace} />
    {:else if router.route === 'trees'}
      <Placeholder title="Trees" note="Your trees will live here." icon="tree" />
    {:else if router.route === 'pots'}
      <Placeholder title="Pots" note="Your pots will live here." icon="pot" />
    {:else}
      <Settings {workspace} onsignout={leave} />
    {/if}
  </div>
  <Fab />
  <TabBar />
{/if}

<style>
  .center {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: var(--gutter);
    text-align: center;
  }
  .err {
    color: var(--danger);
    max-width: 320px;
    line-height: 1.5;
  }
  .pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ink);
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.2;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.4);
    }
  }
  .shell {
    padding: calc(var(--safe-top) + 28px) var(--gutter) calc(var(--tabbar-h) + var(--safe-bottom) + 40px);
    max-width: 640px;
    margin: 0 auto;
  }
</style>
