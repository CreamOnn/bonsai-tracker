import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { watchForUpdates } from './lib/update'

const app = mount(App, {
  target: document.getElementById('app')!,
})

watchForUpdates()

export default app
