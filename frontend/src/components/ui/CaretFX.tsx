"use client";

import { useEffect } from "react";

const NO_CARET_TYPES = new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "submit",
  "button",
  "hidden",
  "image",
  "reset",
]);

export default function CaretFX() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const caret = document.createElement("span");
    caret.className = "cgs-caret-fx";
    document.body.appendChild(caret);

    const mirror = document.createElement("span");
    mirror.className = "cgs-caret-mirror";
    document.body.appendChild(mirror);

    const wrapMirror = document.createElement("div");
    wrapMirror.className = "cgs-caret-wrap-mirror";
    document.body.appendChild(wrapMirror);

    let active: HTMLInputElement | HTMLTextAreaElement | null = null;
    let raf = 0;

    const currentText = (): string => {
      if (!active) return "";
      const v = active.value;
      const pos = Math.min(active.selectionStart ?? v.length, v.length);
      let text = v.slice(0, pos);
      if (active instanceof HTMLInputElement && active.type === "password") {
        text = "•".repeat(text.length);
      }
      return text;
    };

    const applyFont = (cs: CSSStyleDeclaration) => {
      [mirror, wrapMirror].forEach((el) => {
        el.style.fontFamily = cs.fontFamily;
        el.style.fontSize = cs.fontSize;
        el.style.fontWeight = cs.fontWeight;
        el.style.letterSpacing = cs.letterSpacing;
        el.style.lineHeight = cs.lineHeight;
      });
    };

    const measure = () => {
      if (!active) return;
      const cs = getComputedStyle(active);
      const rect = active.getBoundingClientRect();
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padT = parseFloat(cs.paddingTop) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const lineH = cs.lineHeight === "normal" ? (parseFloat(cs.fontSize) || 16) * 1.4 : parseFloat(cs.lineHeight) || 16;

      applyFont(cs);

      const text = currentText();
      const isArea = active instanceof HTMLTextAreaElement;
      let x = padL;
      let y = padT + lineH * 0.12;

      if (isArea) {
        wrapMirror.style.width = `${Math.max(1, active.clientWidth - (parseFloat(cs.borderLeftWidth) || 0) - (parseFloat(cs.borderRightWidth) || 0) - padL - padR)}px`;
        wrapMirror.textContent = text;
        const h = wrapMirror.getBoundingClientRect().height;
        const lines = text.length === 0 ? 1 : Math.max(1, Math.round(h / Math.max(1, lineH)));
        y = padT + (lines - 1) * lineH + lineH * 0.12;
        const lastNl = text.lastIndexOf("\n");
        const lastLine = text.slice(lastNl + 1);
        mirror.textContent = lastLine;
        x = padL + mirror.getBoundingClientRect().width;
      } else {
        mirror.textContent = text;
        x = padL + mirror.getBoundingClientRect().width;
      }

      caret.style.left = `${rect.left + x - (active.scrollLeft || 0)}px`;
      caret.style.top = `${rect.top + y - (active.scrollTop || 0)}px`;
      caret.style.height = `${Math.round(lineH * 0.82)}px`;
    };

    const hide = () => {
      caret.classList.remove("on", "pulse");
      active = null;
    };

    const loop = () => {
      if (active) {
        if (document.activeElement !== active || !document.contains(active)) {
          hide();
        } else {
          measure();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
      if (t.disabled) return;
      if (t instanceof HTMLInputElement && NO_CARET_TYPES.has(t.type)) return;
      // Fields with their own inline smooth caret (SmoothInput) manage their
      // own caret — the global engine must stay out of the way.
      if (t.hasAttribute("data-cgs-smooth-caret")) return;
      active = t;
      caret.classList.remove("pulse");
      caret.classList.add("on");
      measure();
    };

    const onFocusOut = (e: FocusEvent) => {
      const t = e.target;
      if (t === active) hide();
    };

    const onInput = () => {
      if (!active) return;
      caret.classList.remove("pulse");
      void caret.offsetWidth;
      caret.classList.add("pulse");
      measure();
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("input", onInput, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("input", onInput, true);
      caret.remove();
      mirror.remove();
      wrapMirror.remove();
    };
  }, []);

  return null;
}