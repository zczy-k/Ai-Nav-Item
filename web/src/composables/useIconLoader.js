import { ref, reactive } from 'vue'

const MAX_CONCURRENT = 4
const RETRY_DELAYS = [1000, 2000, 4000]

const state = reactive({
  queue: [],
  running: 0,
  cache: new Map(),
  failedUrls: new Set(),
  observers: new Map()
})

function getIconUrl(url, cdnIndex = 0) {
  const CDN_PROVIDERS = [
    (u) => `/api/icon?url=${encodeURIComponent(u)}`,
    (u) => `https://api.xinac.net/icon/?url=${u}&sz=128`,
    (u) => `https://www.google.com/s2/favicons?domain=${new URL(u).hostname}&sz=128`,
    (u) => `https://icon.horse/icon/${new URL(u).hostname}`,
    (u) => `https://favicon.im/${new URL(u).hostname}?larger=true`,
  ]
  
  try {
    return CDN_PROVIDERS[cdnIndex % CDN_PROVIDERS.length](url)
  } catch {
    return CDN_PROVIDERS[0](url)
  }
}

function processQueue() {
  while (state.running < MAX_CONCURRENT && state.queue.length > 0) {
    const task = state.queue.shift()
    state.running++
    
    loadIcon(task).finally(() => {
      state.running--
      processQueue()
    })
  }
}

async function loadIcon(task) {
  const { url, element, cardId, resolve, reject, retryCount = 0, cdnIndex = 0 } = task
  
  if (state.cache.has(url)) {
    const cachedUrl = state.cache.get(url)
    if (element) element.src = cachedUrl
    resolve?.(cachedUrl)
    return
  }
  
  const iconUrl = getIconUrl(url, cdnIndex)
  
  return new Promise((res) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    const timeout = setTimeout(() => {
      img.src = ''
      handleError()
    }, 8000)
    
    img.onload = () => {
      clearTimeout(timeout)
      state.cache.set(url, iconUrl)
      if (element) element.src = iconUrl
      resolve?.(iconUrl)
      res(iconUrl)
    }
    
    img.onerror = () => {
      clearTimeout(timeout)
      handleError()
    }
    
    function handleError() {
      if (cdnIndex < 4) {
        state.queue.unshift({
          ...task,
          cdnIndex: cdnIndex + 1,
          retryCount: 0
        })
        res(null)
      } else if (retryCount < RETRY_DELAYS.length) {
        setTimeout(() => {
          state.queue.push({
            ...task,
            retryCount: retryCount + 1,
            cdnIndex: 0
          })
          processQueue()
        }, RETRY_DELAYS[retryCount])
        res(null)
      } else {
        state.failedUrls.add(url)
        const fallback = '/icons/common/default-favicon.png'
        if (element) element.src = fallback
        resolve?.(fallback)
        res(fallback)
      }
    }
    
    img.src = iconUrl
  })
}

export function useIconLoader() {
  const isLoading = ref(false)
  
  function queueIcon(url, element = null, cardId = null) {
    return new Promise((resolve, reject) => {
      if (!url) {
        resolve('/icons/common/default-favicon.png')
        return
      }
      
      if (state.cache.has(url)) {
        const cachedUrl = state.cache.get(url)
        if (element) element.src = cachedUrl
        resolve(cachedUrl)
        return
      }
      
      if (state.failedUrls.has(url)) {
        const fallback = '/icons/common/default-favicon.png'
        if (element) element.src = fallback
        resolve(fallback)
        return
      }
      
      state.queue.push({ url, element, cardId, resolve, reject })
      processQueue()
    })
  }
  
  function setupLazyLoad(element, url, cardId = null) {
    if (!element || !url) return
    
    if (state.observers.has(element)) {
      state.observers.get(element).disconnect()
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            queueIcon(url, element, cardId)
            observer.disconnect()
            state.observers.delete(element)
          }
        })
      },
      {
        rootMargin: '200px',
        threshold: 0.01
      }
    )
    
    observer.observe(element)
    state.observers.set(element, observer)
    
    return () => {
      observer.disconnect()
      state.observers.delete(element)
    }
  }
  
  function preloadIcons(urls) {
    urls.forEach((url) => {
      if (!state.cache.has(url) && !state.failedUrls.has(url)) {
        queueIcon(url)
      }
    })
  }
  
  function clearCache() {
    state.cache.clear()
    state.failedUrls.clear()
  }
  
  function getCacheStats() {
    return {
      cached: state.cache.size,
      failed: state.failedUrls.size,
      queued: state.queue.length,
      running: state.running
    }
  }
  
  return {
    queueIcon,
    setupLazyLoad,
    preloadIcons,
    clearCache,
    getCacheStats,
    isLoading
  }
}

export const iconLoader = {
  queue: (url, element, cardId) => {
    const { queueIcon } = useIconLoader()
    return queueIcon(url, element, cardId)
  },
  setupLazy: (element, url, cardId) => {
    const { setupLazyLoad } = useIconLoader()
    return setupLazyLoad(element, url, cardId)
  }
}
