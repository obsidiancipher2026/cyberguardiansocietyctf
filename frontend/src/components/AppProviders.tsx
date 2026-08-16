"use client";

import React from "react";
import BackgroundFX from "./BackgroundFX";
import ToastProvider from "./ToastProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundFX />
      <ToastProvider />
      {children}
    </>
  );
}
