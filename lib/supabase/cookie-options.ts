import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * @supabase/ssr usa `httpOnly: false` por padrão (pensado para apps que também
 * têm um client Supabase no browser). Aqui todo acesso ao Supabase é
 * server-side — login, logout e leitura de sessão passam por Route
 * Handlers/Server Components — então o cookie de sessão pode e deve ser
 * httpOnly, como o README exige.
 */
export const authCookieOptions: CookieOptionsWithName = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
