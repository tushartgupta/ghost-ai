const DEFAULT_SIGN_IN_URL = "/sign-in"
const DEFAULT_SIGN_UP_URL = "/sign-up"

export const EDITOR_PATH = "/editor"

export const SIGN_IN_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? DEFAULT_SIGN_IN_URL
export const SIGN_UP_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? DEFAULT_SIGN_UP_URL

export const SIGN_IN_PATH = getPathname(SIGN_IN_URL, DEFAULT_SIGN_IN_URL)
export const SIGN_UP_PATH = getPathname(SIGN_UP_URL, DEFAULT_SIGN_UP_URL)

export function createRoutePattern(pathname: string) {
  return pathname === "/" ? "/" : `${pathname}(.*)`
}

function getPathname(value: string, fallback: string) {
  try {
    const pathname = new URL(value, "https://ghost-ai.local").pathname

    if (pathname === "/") {
      return fallback
    }

    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  } catch {
    return fallback
  }
}
