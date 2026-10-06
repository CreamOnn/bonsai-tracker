<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { AuthRedirect, consumeRedirect, getToken, hasSignedInBefore, rememberEmail, signIn, signOut } from './lib/auth'
  import { ensureWorkspace, type Workspace } from './lib/drive'
  import { go, router } from './lib/router.svelte'
  import { loadDb, ui } from './lib/store.svelte'
  import SignIn from './views/SignIn.svelte'
  import Home from './views/Home.svelte'
  import Settings from './views/Settings.svelte'
  import Collection from './views/Collection.svelte'
  import TreeDetail from './views/TreeDetail.svelte'
  import TreeForm from './views/TreeForm.svelte'
  import PotDetail from './views/PotDetail.svelte'
  import PotForm from './views/PotForm.svelte'
  import MakerDetail from './views/MakerDetail.svelte'
  import LogCareForm from './views/LogCareForm.svelte'
  import SettingsSchedules from './views/SettingsSchedules.svelte'
  import SettingsCareTypes from './views/SettingsCareTypes.svelte'
  import SettingsFertilisers from './views/SettingsFertilisers.svelte'
  import SettingsSpecies from './views/SettingsSpecies.svelte'
  import TabBar from './lib/TabBar.svelte'
  import Fab from './lib/Fab.svelte'
  import BottomSheet from './lib/BottomSheet.svelte'

  let addBusy = $state(false)

  // App-wide sheets belong to the page they were opened on.
  $effect(() => {
    void router.route
    void router.param
    if (untrack(() => addBusy)) return
    ui.addTree = false
    ui.addPot = false
    ui.logCare = false
  })

  type Phase = 'booting' | 'signed_out' | 'connecting' | 'ready' | 'error'
  let phase = $state<Phase>('booting')
  let error = $state('')
  let workspace = $state<Workspace | null>(null)

  async function connect() {
    phase = 'connecting'
    try {
      const ws = await ensureWorkspace()
      rememberEmail(ws.email)
      await loadDb(ws)
      workspace = ws
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
    {:else if router.route === 'trees' && router.param}
      {#key router.param}<TreeDetail id={router.param} />{/key}
    {:else if router.route === 'trees'}
      <Collection kind="tree" />
    {:else if router.route === 'pots' && router.param}
      {#key router.param}<PotDetail id={router.param} />{/key}
    {:else if router.route === 'pots'}
      <Collection kind="pot" />
    {:else if router.route === 'makers'}
      {#key router.param}<MakerDetail id={router.param} />{/key}
    {:else if router.param === 'schedules'}
      <SettingsSchedules />
    {:else if router.param === 'care-types'}
      <SettingsCareTypes />
    {:else if router.param === 'fertilisers'}
      <SettingsFertilisers />
    {:else if router.param === 'species'}
      <SettingsSpecies />
    {:else}
      <Settings {workspace} onsignout={leave} />
    {/if}
  </div>
  <Fab />
  <TabBar />
  <BottomSheet bind:open={ui.addTree} title="New tree" busy={addBusy}>
    <TreeForm
      bind:busy={addBusy}
      onsaved={(t) => {
        ui.addTree = false
        go('trees', t.id)
      }}
    />
  </BottomSheet>
  <BottomSheet bind:open={ui.addPot} title="New pot" busy={addBusy}>
    <PotForm
      bind:busy={addBusy}
      onsaved={(p) => {
        ui.addPot = false
        go('pots', p.id)
      }}
    />
  </BottomSheet>
  <BottomSheet bind:open={ui.logCare} title={ui.logCareTree ? 'Log care' : 'Log care round'} busy={addBusy}>
    {#key ui.logCare}
      <LogCareForm bind:busy={addBusy} ondone={() => (ui.logCare = false)} />
    {/key}
  </BottomSheet>
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
