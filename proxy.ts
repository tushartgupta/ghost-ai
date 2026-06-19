import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

import {
  EDITOR_PATH,
  SIGN_IN_URL,
  SIGN_IN_PATH,
  SIGN_UP_URL,
  SIGN_UP_PATH,
  createRoutePattern,
} from "@/lib/auth-paths"

const isPublicRoute = createRouteMatcher([
  "/",
  createRoutePattern(SIGN_IN_PATH),
  createRoutePattern(SIGN_UP_PATH),
])

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect()
    }
  },
  {
    afterSignInUrl: EDITOR_PATH,
    afterSignUpUrl: EDITOR_PATH,
    jwtKey: process.env.CLERK_JWT_KEY,
    proxyUrl: "/__clerk",
    signInUrl: SIGN_IN_URL,
    signUpUrl: SIGN_UP_URL,
  },
)

export const config = {
  matcher: [
    "/((?!__clerk|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
