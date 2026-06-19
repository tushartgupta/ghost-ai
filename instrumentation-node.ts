import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici"

const DEFAULT_PROXY_CONNECT_TIMEOUT_MS = 3_000

const hasProxyConfig = Boolean(
  process.env.HTTP_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.https_proxy,
)

if (hasProxyConfig) {
  const proxyConnectTimeout = getProxyConnectTimeout()

  setGlobalDispatcher(
    new EnvHttpProxyAgent({
      connectTimeout: proxyConnectTimeout,
      proxyTls: {
        timeout: proxyConnectTimeout,
      },
      requestTls: {
        timeout: proxyConnectTimeout,
      },
    }),
  )
}

function getProxyConnectTimeout() {
  const rawTimeout = process.env.PROXY_CONNECT_TIMEOUT_MS

  if (!rawTimeout) {
    return DEFAULT_PROXY_CONNECT_TIMEOUT_MS
  }

  const timeout = Number(rawTimeout)

  if (!Number.isFinite(timeout) || timeout < 0) {
    return DEFAULT_PROXY_CONNECT_TIMEOUT_MS
  }

  return timeout
}
