export const RETURN_CURRENT_TAILWIND_CDN = "https://cdn.tailwindcss.com/3.4.17"
export const RETURN_CURRENT_TAILWIND_SCOPE = "[data-return-current-dialog]"

/** Tailwind's default variable rules need the same scope as its utilities. */
export const scopeReturnCurrentTailwindSelector = (selector: string) => {
  if (selector.includes(RETURN_CURRENT_TAILWIND_SCOPE)) return selector
  return selector
    .split(",")
    .flatMap((part) => {
      const trimmed = part.trim()
      return trimmed === "*"
        ? [RETURN_CURRENT_TAILWIND_SCOPE, `${RETURN_CURRENT_TAILWIND_SCOPE} *`]
        : trimmed.startsWith("::")
          ? [
              `${RETURN_CURRENT_TAILWIND_SCOPE}${trimmed}`,
              `${RETURN_CURRENT_TAILWIND_SCOPE} ${trimmed}`,
            ]
          : [`${RETURN_CURRENT_TAILWIND_SCOPE} ${trimmed}`]
    })
    .join(", ")
}

interface Compiler {
  ready: Promise<void>
  addRoot: (root: HTMLElement) => () => void
}
const compilers = new WeakMap<Document, Compiler>()

/**
 * Load on first use. The CDN compiler lives in its own realm so it never
 * replaces a host's window.tailwind, scans the PCB, or installs host preflight.
 * Only prefixed, scoped styles are copied into the host document.
 */
export const loadReturnCurrentDialogTailwind = async (
  root: HTMLElement,
): Promise<() => void> => {
  const hostDocument = root.ownerDocument
  let compiler = compilers.get(hostDocument)
  if (!compiler) {
    compiler = createCompiler(hostDocument)
    compilers.set(hostDocument, compiler)
  }
  const dispose = compiler.addRoot(root)
  try {
    await compiler.ready
    return dispose
  } catch (error) {
    dispose()
    if (compilers.get(hostDocument) === compiler) compilers.delete(hostDocument)
    throw error
  }
}

function createCompiler(hostDocument: Document): Compiler {
  const frame = hostDocument.createElement("iframe")
  frame.hidden = true
  frame.tabIndex = -1
  frame.setAttribute("aria-hidden", "true")
  frame.setAttribute("data-return-current-tailwind-compiler", "")
  hostDocument.body.append(frame)
  const compilerDocument = frame.contentDocument
  if (!compilerDocument?.head || !frame.contentWindow) {
    frame.remove()
    return {
      ready: Promise.reject(new Error("Tailwind styling is unavailable")),
      addRoot: () => () => {},
    }
  }

  const classHolder = compilerDocument.createElement("div")
  compilerDocument.body.append(classHolder)
  const hostStyle = hostDocument.createElement("style")
  hostStyle.setAttribute("data-return-current-tailwind", "")
  const tokens = new Set<string>()
  let settled = false
  let timer: ReturnType<typeof setTimeout>
  let resolveReady: () => void
  let rejectReady: (error: Error) => void
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  const fail = () => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    styleObserver.disconnect()
    frame.remove()
    hostStyle.remove()
    rejectReady(new Error("Tailwind styling is unavailable"))
  }

  const scopeRules = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule.type === 1) {
        const styleRule = rule as CSSStyleRule
        styleRule.selectorText = scopeReturnCurrentTailwindSelector(
          styleRule.selectorText,
        )
      } else if ("cssRules" in rule && rule.type !== 7) {
        scopeRules((rule as CSSGroupingRule).cssRules)
      }
    }
  }
  const copyStyles = () => {
    for (const style of compilerDocument.querySelectorAll("style")) {
      if (!style.textContent?.includes("rctw-") || !style.sheet) continue
      scopeRules(style.sheet.cssRules)
      hostStyle.textContent = Array.from(style.sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n")
      if (!hostStyle.isConnected) hostDocument.head.append(hostStyle)
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolveReady()
      }
    }
  }
  const styleObserver = new MutationObserver(copyStyles)
  styleObserver.observe(compilerDocument.head, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  const script = compilerDocument.createElement("script")
  script.src = RETURN_CURRENT_TAILWIND_CDN
  script.setAttribute("data-return-current-tailwind-cdn", "")
  script.onerror = fail
  script.onload = () => {
    const runtime = (
      frame.contentWindow as unknown as { tailwind?: { config: unknown } }
    ).tailwind
    if (!runtime) {
      fail()
      return
    }
    runtime.config = {
      prefix: "rctw-",
      important: RETURN_CURRENT_TAILWIND_SCOPE,
      corePlugins: { preflight: false },
    }
  }
  timer = setTimeout(fail, 12_000)
  compilerDocument.head.append(script)

  return {
    ready,
    addRoot(root) {
      const update = () => {
        const previousSize = tokens.size
        for (const element of [root, ...root.querySelectorAll("[class]")])
          for (const token of element.classList)
            if (token.includes("rctw-")) tokens.add(token)
        if (tokens.size !== previousSize)
          classHolder.className = [...tokens].join(" ")
      }
      update()
      const observer = new MutationObserver(update)
      observer.observe(root, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true,
      })
      return () => observer.disconnect()
    },
  }
}
