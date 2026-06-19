import { readFile } from "node:fs/promises"
import { request as httpsRequest } from "node:https"
import path from "node:path"

import { HttpsProxyAgent } from "https-proxy-agent"

const CLERK_PROXY_PATH = "/__clerk"
const CLERK_JS_MAJOR_ALIAS_PATH =
  "/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
const CLERK_UI_MAJOR_ALIAS_PATH = "/npm/@clerk/ui@1/dist/ui.browser.js"
const LOCAL_CLERK_JS_VERSION =
  process.env.NEXT_PUBLIC_CLERK_JS_VERSION ?? "6.17.0"
const LOCAL_CLERK_UI_VERSION =
  process.env.NEXT_PUBLIC_CLERK_UI_VERSION ?? "1.17.0"
const LOCAL_CLERK_ASSET_PACKAGES = [
  {
    packageName: "@clerk/clerk-js",
    version: LOCAL_CLERK_JS_VERSION,
    distPath: path.join(
      process.cwd(),
      "node_modules",
      "@clerk",
      "clerk-js",
      "dist",
    ),
  },
  {
    packageName: "@clerk/ui",
    version: LOCAL_CLERK_UI_VERSION,
    distPath: path.join(process.cwd(), "node_modules", "@clerk", "ui", "dist"),
  },
]
const REQUEST_HEADERS_TO_STRIP = new Set([
  "connection",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-prefix",
  "x-forwarded-proto",
  "x-real-ip",
])
const RESPONSE_HEADERS_TO_STRIP = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])
const RETRYABLE_FETCH_ERROR_CODES = new Set(["UND_ERR_CONNECT_TIMEOUT"])
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
const DEFAULT_NODE_PROXY_REQUEST_TIMEOUT_MS = 10_000

export const runtime = "nodejs"

interface ClerkFetchOptions extends RequestInit {
  bufferedBody?: Buffer
  duplex?: "half"
}

interface HeadersWithOptionalSetCookie {
  getSetCookie?: () => string[]
}

export async function GET(request: Request) {
  return proxyClerkFrontendApi(request)
}

export async function POST(request: Request) {
  return proxyClerkFrontendApi(request)
}

export async function PUT(request: Request) {
  return proxyClerkFrontendApi(request)
}

export async function DELETE(request: Request) {
  return proxyClerkFrontendApi(request)
}

export async function PATCH(request: Request) {
  return proxyClerkFrontendApi(request)
}

function getFrontendApiHost() {
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  const encodedHost = publishableKey?.match(/^pk_(?:test|live)_(.+)$/)?.[1]

  if (!encodedHost) {
    throw new Error("Missing or invalid Clerk publishable key")
  }

  return Buffer.from(encodedHost, "base64").toString("utf8").replace(/\$$/, "")
}

async function proxyClerkFrontendApi(request: Request) {
  const requestUrl = new URL(request.url)
  const localAliasRedirect = createLocalAssetAliasRedirect(requestUrl)

  if (localAliasRedirect) {
    return localAliasRedirect
  }

  const localAssetResponse = await createLocalClerkAssetResponse(requestUrl)

  if (localAssetResponse) {
    return localAssetResponse
  }

  const targetOrigin = `https://${getFrontendApiHost()}`
  const targetUrl = new URL(
    `${targetOrigin}${requestUrl.pathname.slice(CLERK_PROXY_PATH.length) || "/"}`,
  )
  targetUrl.search = requestUrl.search

  const headers = createForwardedHeaders(request.headers)
  const fetchOptions: ClerkFetchOptions = {
    method: request.method,
    headers,
    redirect: "manual",
  }

  if (request.body !== null) {
    const requestBody = await request.arrayBuffer()
    fetchOptions.body = new Blob([requestBody])
    fetchOptions.bufferedBody = Buffer.from(requestBody)
    fetchOptions.duplex = "half"
  }

  const response = await fetchClerkFrontendApi(targetUrl, fetchOptions)
  const responseHeaders = createResponseHeaders(
    response.headers,
    targetOrigin,
    requestUrl.origin,
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

function createLocalAssetAliasRedirect(requestUrl: URL) {
  const proxyPath = requestUrl.pathname.slice(CLERK_PROXY_PATH.length)
  let versionedPath: string | null = null

  if (
    proxyPath === CLERK_JS_MAJOR_ALIAS_PATH &&
    process.env.NEXT_PUBLIC_CLERK_JS_VERSION
  ) {
    versionedPath = CLERK_JS_MAJOR_ALIAS_PATH.replace(
      "@clerk/clerk-js@6",
      `@clerk/clerk-js@${process.env.NEXT_PUBLIC_CLERK_JS_VERSION}`,
    )
  }

  if (
    proxyPath === CLERK_UI_MAJOR_ALIAS_PATH &&
    process.env.NEXT_PUBLIC_CLERK_UI_VERSION
  ) {
    versionedPath = CLERK_UI_MAJOR_ALIAS_PATH.replace(
      "@clerk/ui@1",
      `@clerk/ui@${process.env.NEXT_PUBLIC_CLERK_UI_VERSION}`,
    )
  }

  if (!versionedPath) {
    return null
  }

  const location = `${CLERK_PROXY_PATH}${versionedPath}${requestUrl.search}`

  return new Response(null, {
    status: 307,
    headers: { location },
  })
}

async function createLocalClerkAssetResponse(requestUrl: URL) {
  const asset = getLocalClerkAsset(requestUrl)

  if (!asset) {
    return null
  }

  try {
    const file = await readFile(asset.filePath)
    const contentType = asset.filePath.endsWith(".map")
      ? "application/json; charset=utf-8"
      : "application/javascript; charset=utf-8"

    return new Response(file, {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": contentType,
        "x-clerk-local-asset": asset.packageName,
      },
    })
  } catch (error) {
    if (isNodeFileNotFoundError(error)) {
      return null
    }

    throw error
  }
}

function getLocalClerkAsset(requestUrl: URL) {
  const proxyPath = requestUrl.pathname.slice(CLERK_PROXY_PATH.length)

  for (const localPackage of LOCAL_CLERK_ASSET_PACKAGES) {
    const localPrefix = `/npm/${localPackage.packageName}@${localPackage.version}/dist/`

    if (!proxyPath.startsWith(localPrefix)) {
      continue
    }

    const fileName = proxyPath.slice(localPrefix.length)

    if (!/^[A-Za-z0-9._-]+\.js(?:\.map)?$/.test(fileName)) {
      return null
    }

    return {
      filePath: path.join(localPackage.distPath, fileName),
      packageName: localPackage.packageName,
    }
  }

  return null
}

function isNodeFileNotFoundError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  )
}

async function fetchClerkFrontendApi(
  targetUrl: URL,
  fetchOptions: ClerkFetchOptions,
) {
  const shouldRetry =
    RETRYABLE_METHODS.has(fetchOptions.method ?? "GET") &&
    !fetchOptions.bufferedBody
  let lastError: unknown

  try {
    const nodeProxyResponse = await fetchClerkFrontendApiWithNodeProxy(
      targetUrl,
      fetchOptions,
    )

    if (nodeProxyResponse) {
      return nodeProxyResponse
    }
  } catch (error) {
    lastError = error
  }

  const maxAttempts = shouldRetry ? 2 : 1

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(targetUrl, fetchOptions)
    } catch (error) {
      lastError = error

      if (attempt === maxAttempts || !isRetryableFetchError(error)) {
        throw error
      }
    }
  }

  throw lastError
}

async function fetchClerkFrontendApiWithNodeProxy(
  targetUrl: URL,
  fetchOptions: ClerkFetchOptions,
) {
  const proxyUrl = getHttpsProxyUrl()

  if (!proxyUrl || targetUrl.protocol !== "https:") {
    return null
  }

  const timeout = getNodeProxyRequestTimeout()
  const agent = new HttpsProxyAgent(proxyUrl, {
    family: getNodeProxyAddressFamily(),
    timeout,
  })

  return new Promise<Response>((resolve, reject) => {
    const request = httpsRequest(
      targetUrl,
      {
        agent,
        headers: createOutgoingHeaders(fetchOptions.headers),
        method: fetchOptions.method ?? "GET",
        timeout,
      },
      (response) => {
        const chunks: Buffer[] = []

        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk)
        })
        response.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              headers: createHeadersFromIncomingMessage(response.headers),
              status: response.statusCode ?? 500,
              statusText: response.statusMessage,
            }),
          )
        })
      },
    )

    request.on("timeout", () => {
      request.destroy(new Error("Clerk proxy request timed out"))
    })
    request.on("error", reject)

    if (fetchOptions.bufferedBody) {
      request.write(fetchOptions.bufferedBody)
    }

    request.end()
  })
}

function getHttpsProxyUrl() {
  return (
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    null
  )
}

function getNodeProxyAddressFamily() {
  return process.env.PROXY_FORCE_IPV4 === "false" ? undefined : 4
}

function getNodeProxyRequestTimeout() {
  const rawTimeout = process.env.PROXY_REQUEST_TIMEOUT_MS

  if (!rawTimeout) {
    return DEFAULT_NODE_PROXY_REQUEST_TIMEOUT_MS
  }

  const timeout = Number(rawTimeout)

  if (!Number.isFinite(timeout) || timeout < 0) {
    return DEFAULT_NODE_PROXY_REQUEST_TIMEOUT_MS
  }

  return timeout
}

function createOutgoingHeaders(headers: HeadersInit | undefined) {
  const outgoingHeaders: Record<string, string> = {}

  new Headers(headers).forEach((value, key) => {
    outgoingHeaders[key] = value
  })

  return outgoingHeaders
}

function createHeadersFromIncomingMessage(
  headers: Record<string, number | string | string[] | undefined>,
) {
  const responseHeaders = new Headers()

  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "undefined") {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => responseHeaders.append(key, item))
      return
    }

    responseHeaders.set(key, String(value))
  })

  return responseHeaders
}

function isRetryableFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const cause = error.cause

  if (typeof cause !== "object" || cause === null) {
    return false
  }

  const { code } = cause as { code?: unknown }

  return typeof code === "string" && RETRYABLE_FETCH_ERROR_CODES.has(code)
}

function createForwardedHeaders(headers: Headers) {
  const forwarded = new Headers()
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()

    if (!REQUEST_HEADERS_TO_STRIP.has(lowerKey)) {
      forwarded.set(key, value)
    }
  })
  forwarded.set("accept-encoding", "identity")
  return forwarded
}

function createResponseHeaders(
  headers: Headers,
  targetOrigin: string,
  requestOrigin: string,
) {
  const responseHeaders = new Headers()
  const setCookieHeaders = getSetCookieHeaders(headers)

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()

    if (
      !RESPONSE_HEADERS_TO_STRIP.has(lowerKey) &&
      lowerKey !== "set-cookie"
    ) {
      responseHeaders.append(key, value)
    }
  })

  setCookieHeaders.forEach((cookie) => {
    responseHeaders.append("set-cookie", cookie)
  })

  const location = headers.get("location")
  if (location) {
    const locationUrl = new URL(location, targetOrigin)

    if (locationUrl.origin === targetOrigin) {
      responseHeaders.set(
        "location",
        `${requestOrigin}${CLERK_PROXY_PATH}${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`,
      )
    }
  }

  return responseHeaders
}

function getSetCookieHeaders(headers: Headers) {
  const headersWithSetCookie = headers as HeadersWithOptionalSetCookie

  if (typeof headersWithSetCookie.getSetCookie === "function") {
    return headersWithSetCookie.getSetCookie()
  }

  const cookies: string[] = []

  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value)
    }
  })

  return cookies
}
