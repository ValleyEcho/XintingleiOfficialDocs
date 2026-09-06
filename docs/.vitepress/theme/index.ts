import DefaultTheme from 'vitepress/theme'
import './custom.css'
import { inBrowser } from 'vitepress'

const MOTION_TARGETS = [
  'img',
  '.custom-block',
  'pre',
  'table',
  '.vp-code-group'
].join(', ')

export default {
  ...DefaultTheme,
  enhanceApp() {
    if (!inBrowser) return

    const root = document.documentElement
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let panels: HTMLElement[] = []
    let rafId = 0
    let motionFrame = 0
    let mouseX = 0
    let mouseY = 0
    let revealObserver: IntersectionObserver | undefined

    const refreshPanels = () => {
      panels = supportsHover
        ? Array.from(document.querySelectorAll<HTMLElement>('.VPDoc, .VPSidebar, .VPNav'))
        : []
    }

    const updatePanels = () => {
      rafId = 0
      panels.forEach((panel) => {
        const rect = panel.getBoundingClientRect()
        panel.style.setProperty('--mouse-x', `${mouseX - rect.left}px`)
        panel.style.setProperty('--mouse-y', `${mouseY - rect.top}px`)
      })
    }

    const setRevealOrder = (article: HTMLElement) => {
      const directChildren = Array.from(article.children)
      directChildren.slice(0, 18).forEach((element, index) => {
        element.classList.add('xtl-page-reveal')
        element.setAttribute('data-motion-order', String(Math.min(index, 8)))
      })
    }

    const observeReadingDetails = (article: HTMLElement) => {
      revealObserver?.disconnect()
      if (reduceMotion) return

      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('xtl-scroll-in')
            revealObserver?.unobserve(entry.target)
          }
        })
      }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 })

      article.querySelectorAll<HTMLElement>(MOTION_TARGETS).forEach((element) => {
        // Direct children already belong to the route entrance sequence.
        if (element.parentElement === article) return
        element.classList.add('xtl-scroll-reveal')
        revealObserver?.observe(element)
      })
    }

    const runRouteMotion = () => {
      motionFrame = 0
      refreshPanels()

      const article = document.querySelector<HTMLElement>('.vp-doc')
      if (!article) return

      root.classList.add('xtl-motion-ready')
      setRevealOrder(article)
      observeReadingDetails(article)

      if (reduceMotion) return

      article.classList.remove('xtl-route-enter')
      void article.offsetWidth
      article.classList.add('xtl-route-enter')
    }

    const scheduleRouteMotion = () => {
      if (motionFrame) return
      motionFrame = window.requestAnimationFrame(() => {
        motionFrame = window.requestAnimationFrame(runRouteMotion)
      })
    }

    const animateMobileMenu = () => {
      if (reduceMotion) return

      const screen = document.querySelector<HTMLElement>('.VPNavScreen:not(.xtl-mobile-menu-ready)')
      if (!screen) return

      screen.classList.add('xtl-mobile-menu-ready')
      screen.querySelectorAll<HTMLElement>('.VPNavScreenMenu > *').forEach((item, index) => {
        item.style.setProperty('--xtl-menu-index', String(Math.min(index, 9)))
      })

      window.requestAnimationFrame(() => {
        if (document.body.contains(screen)) {
          screen.classList.add('xtl-mobile-menu-visible')
        }
      })
    }

    const start = () => {
      refreshPanels()
      scheduleRouteMotion()
      animateMobileMenu()

      if (supportsHover) {
        window.addEventListener('mousemove', (event) => {
          mouseX = event.clientX
          mouseY = event.clientY

          if (!rafId) {
            rafId = window.requestAnimationFrame(updatePanels)
          }
        }, { passive: true })
      }

      window.addEventListener('resize', refreshPanels, { passive: true })
      window.addEventListener('popstate', scheduleRouteMotion)
      window.addEventListener('hashchange', scheduleRouteMotion)

      const observer = new MutationObserver((records) => {
        animateMobileMenu()
        const pageChanged = records.some((record) => {
          const target = record.target instanceof Element ? record.target : null
          return target?.closest('.VPContent') || record.addedNodes.length > 0 &&
            Array.from(record.addedNodes).some((node) => node instanceof Element &&
              (node.matches('.VPContent, .vp-doc') || node.querySelector('.vp-doc')))
        })
        if (pageChanged) scheduleRouteMotion()
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true })
    } else {
      start()
    }
  }
}
