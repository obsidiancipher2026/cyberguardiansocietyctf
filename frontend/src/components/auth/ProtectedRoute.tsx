"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  // Fire the login redirect at most once per mount. The App Router can hand
  // out a new `router` identity mid-navigation, which previously re-ran this
  // effect and re-fired router.replace() in an endless redirect loop.
  const redirected = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      if (!redirected.current) {
        redirected.current = true;
        router.replace("/auth/login");
      }
    } else {
      setAuthorized(true);
    }
    setChecking(false);

    // A session that dies mid-use (refresh failed) fires this event from the
    // API client; every protected page must bail out to the login screen
    // instead of silently rendering demo data.
    const onExpired = () => {
      setAuthorized(false);
      if (!redirected.current) {
        redirected.current = true;
        router.replace("/auth/login");
      }
    };
    window.addEventListener("cgs:session-expired", onExpired);
    return () => window.removeEventListener("cgs:session-expired", onExpired);
  }, [router]);

  if (checking || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="font-body text-xs text-muted">Verifying session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
