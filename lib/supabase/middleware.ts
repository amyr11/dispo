import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Define routes that do not require an Owner account
const PUBLIC_ROUTES = ["/", "/auth"]
const PROFILE_SETUP_ROUTE = "/profile/setup"

function isPublicEventRoute(pathname: string): boolean {
  return /^\/events\/\d+\/public\/?$/.test(pathname)
}

function isPublicEventCameraRoute(pathname: string): boolean {
  return /^\/events\/\d+\/public\/camera\/?$/.test(pathname)
}

function isPublicEventCaptureRoute(pathname: string): boolean {
  return /^\/events\/\d+\/public\/capture\/?$/.test(pathname)
}

function isPublicEventGalleryRoute(pathname: string): boolean {
  return /^\/events\/\d+\/gallery\/?$/.test(pathname)
}

function isPublicEventGalleryDownloadRoute(pathname: string): boolean {
  return /^\/events\/\d+\/gallery\/download\/?$/.test(pathname)
}

function isPublicEventGalleryApiRoute(pathname: string): boolean {
  return /^\/api\/events\/\d+\/gallery\/verify\/?$/.test(pathname)
}

function isPublicEventApiRoute(pathname: string): boolean {
  return /^\/api\/events\/\d+\/public\/(verify|join)\/?$/.test(pathname)
}

function isProfileSetupRoute(pathname: string): boolean {
  return pathname === PROFILE_SETUP_ROUTE || pathname.startsWith(`${PROFILE_SETUP_ROUTE}/`)
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const { pathname } = request.nextUrl

  // Check if the current path starts with any of the public route prefixes
  const isPublicRoute =
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) ||
    isPublicEventRoute(pathname) ||
    isPublicEventCameraRoute(pathname) ||
    isPublicEventCaptureRoute(pathname) ||
    isPublicEventGalleryRoute(pathname) ||
    isPublicEventGalleryDownloadRoute(pathname) ||
    isPublicEventGalleryApiRoute(pathname) ||
    isPublicEventApiRoute(pathname)

  // Redirect to login ONLY if there is no user AND the route is NOT public
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.sub)
      .maybeSingle<{ id: string }>()

    if (profileError) {
      console.error("Profile gate lookup error:", profileError)
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    const profileSetupRoute = isProfileSetupRoute(pathname)
    const isExemptWhileIncomplete = profileSetupRoute

    if (!profile && !isExemptWhileIncomplete) {
      const url = request.nextUrl.clone()
      url.pathname = PROFILE_SETUP_ROUTE
      return NextResponse.redirect(url)
    }

    if (profile && profileSetupRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
