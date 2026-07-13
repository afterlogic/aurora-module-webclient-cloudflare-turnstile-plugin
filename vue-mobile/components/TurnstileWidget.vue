<template>
  <div v-show="visible" ref="containerRef" class="turnstile-place-cover" />
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'

import settings from '../settings'
import turnstileApi from '../turnstile-api'

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

function loadScript () {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }

    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default {
  name: 'TurnstileWidget',

  setup () {
    const containerRef = ref(null)
    const visible = ref(settings.getSetting('showTurnstile'))
    let widgetId = null

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.value || widgetId !== null) {
        return
      }

      widgetId = window.turnstile.render(containerRef.value, {
        sitekey: settings.getSetting('siteKey'),
        size: 'flexible',
      })
    }

    const getTokenParameters = () => {
      if (!window.turnstile || widgetId === null) {
        return false
      }

      const token = window.turnstile.getResponse(widgetId)
      if (!token) {
        return false
      }

      return {
        [settings.getSetting('moduleName') + 'Token']: token,
      }
    }

    const reset = () => {
      if (typeof window.turnstile !== 'undefined' && widgetId !== null) {
        window.turnstile.reset(widgetId)
        window.turnstile.execute(widgetId)
      }
    }

    onMounted(async () => {
      turnstileApi.setApi({ getTokenParameters, reset })

      if (settings.getSetting('showTurnstile') && settings.getSetting('siteKey')) {
        await loadScript()
        renderWidget()
      }
    })

    onBeforeUnmount(() => {
      turnstileApi.setApi(null)
    })

    return {
      containerRef,
      visible,
    }
  },
}
</script>

<style lang="scss" scoped>
.turnstile-place-cover {
  margin: 0 auto;
  display: table;
}
</style>
