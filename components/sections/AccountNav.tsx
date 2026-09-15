"use client";

import { useTranslations } from "next-intl";

import { authClient, signOut } from "@/lib/auth/client";
import { Link, usePathname } from "@/lib/i18n/navigation";

/**
 * The account corner of the header: a log-in link, or "My account" and a way
 * out once there is a session. No link to the dashboard: the owner wants it
 * hidden from the storefront (2026-09-14) — staff open it directly and sign in
 * there. Customers' own pages live in the storefront at /account (G07).
 *
 * One component used by both the desktop bar and the mobile drawer, so the two
 * cannot drift into disagreeing about whether someone is signed in.
 *
 * `variant="slot"` is the header's icon-tile slot (#22): one text item beside
 * the tile, so log out shrinks to a small icon button there. The drawer has the
 * room for both as words.
 *
 * While the session is still loading it renders NOTHING rather than guessing.
 * Showing "log in" first and swapping it a beat later is the worse failure: a
 * signed-in customer sees the site tell them they are signed out, which reads
 * as having been logged out.
 */
export function AccountNav({
  tabIndex,
  variant = "drawer",
}: {
  tabIndex?: number;
  variant?: "slot" | "drawer";
}) {
  const tc = useTranslations("common");
  const ta = useTranslations("account");
  const pathname = usePathname();

  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    // Holds the space so the header does not reflow when this resolves.
    return <span aria-hidden style={{ minWidth: "4rem" }} />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="bobr-navlink"
        tabIndex={tabIndex}
        style={{ fontSize: "var(--bobr-text-body)", whiteSpace: "nowrap" }}
      >
        {tc("login")}
      </Link>
    );
  }

  const inAccount = pathname === "/account" || pathname.startsWith("/account/");
  const slot = variant === "slot";

  const logOut = () => {
    void signOut().then(() => {
      // Full reload rather than a client navigation: every server component
      // that rendered with a session has to be rebuilt without one, and a soft
      // push would leave the cached signed-in markup.
      window.location.assign("/");
    });
  };

  return (
    <>
      <Link
        href="/account"
        className="bobr-navlink"
        tabIndex={tabIndex}
        data-testid="account-nav-link"
        data-active={inAccount ? "true" : undefined}
        aria-current={pathname === "/account" ? "page" : undefined}
        style={{
          fontSize: "var(--bobr-text-body)",
          fontWeight: "var(--bobr-weight-medium)",
          whiteSpace: "nowrap",
        }}
      >
        {ta("myAccount")}
      </Link>
      {slot ? (
        <button
          type="button"
          tabIndex={tabIndex}
          onClick={logOut}
          aria-label={tc("logout")}
          title={tc("logout")}
          className="bobr-locale"
          style={{
            color: "var(--bobr-fg)",
            display: "inline-grid",
            placeItems: "center",
            width: 36,
            height: 36,
            marginLeft: 2,
            background: "none",
            border: "1px solid var(--bobr-border)",
            borderRadius: "var(--bobr-radius-control)",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <LogOutGlyph />
        </button>
      ) : (
        <button
          type="button"
          className="bobr-navlink"
          tabIndex={tabIndex}
          onClick={logOut}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            font: "inherit",
            fontSize: "var(--bobr-text-body)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {tc("logout")}
        </button>
      )}
    </>
  );
}

/** A door with an arrow leaving it. Decorative; the button's label names it. */
function LogOutGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 2.75H3.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 5l3 3-3 3M13 8H6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
