"use client";

import { useRef } from "react";
import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";

export default function HomeActions() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <div className="home-actions">
        <Link href="/play" className="play-btn">
          Play
        </Link>
        <button type="button" className="login-btn" onClick={open}>
          Login / Sign up
        </button>
      </div>

      {/* Native <dialog>: Esc closes it and focus stays inside while open. */}
      <dialog
        ref={dialogRef}
        className="auth-dialog"
        aria-label="Login or sign up"
        onClick={(e) => {
          // Clicking the dimmed backdrop closes the panel.
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="dialog-body">
          <button
            type="button"
            className="dialog-close"
            onClick={close}
            aria-label="Close"
          >
            Close
          </button>
          <AuthPanel />
        </div>
      </dialog>
    </>
  );
}
