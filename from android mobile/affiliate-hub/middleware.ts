// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get:    (name: string) => req.cookies.get(name)?.value,
        set:    (name: string, value: string, opts: any) => res.cookies.set({ name, value, ...opts }),
        remove: (name: string, opts: any) => res.cookies.set({ name, value: "", ...opts }),
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;

  // ── Protected routes ────────────────────────────────
  if (path.startsWith("/dashboard") || path.startsWith("/admin")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      return NextResponse.redirect(url);
    }

    // Admin routes — ตรวจ role (เพิ่ม is_admin column ใน users table)
    if (path.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("aff_users")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  // ── Redirect logged-in users away from landing ──────
  if (path === "/" && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*"],
};
