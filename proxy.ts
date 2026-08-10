import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg"
  );
}

/**
 * Renovação de sessão a cada requisição (padrão @supabase/ssr) + redirect para
 * /login quando não autenticado. Renomeado de `middleware` para `proxy`
 * (convenção do Next 16); sempre roda em Node.js, nunca em edge.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dossies", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|assets/).*)"],
};
