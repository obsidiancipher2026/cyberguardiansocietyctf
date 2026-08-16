"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import React, {
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

const inputClassName =
  "w-full bg-transparent outline-none focus-visible:outline-none text-inherit";

type InputFieldProps = ComponentPropsWithoutRef<"input"> & {
  wrapperClassName?: string;
};

type SmoothInputType =
  | "text"
  | "password"
  | "email"
  | "search"
  | "url"
  | "tel";

type SmoothInputProps = Omit<InputFieldProps, "type"> & {
  type?: SmoothInputType;
  /** Optional inline font-size override for the caret measurement. */
  fontSize?: number;
};

/** The InputField wrapper (no caret) — matches the SmoothInput shell. */
const Input = ({ className, wrapperClassName, ...props }: InputFieldProps) => {
  return (
    <div
      className={cn(
        "relative w-full has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary/40",
        wrapperClassName
      )}
    >
      <input className={cn(inputClassName, className)} {...props} />
    </div>
  );
};

const PASSWORD_CHAR =
  typeof navigator !== "undefined" &&
  /firefox|fxios/i.test(navigator.userAgent)
    ? "\u25CF"
    : "\u2022";

/**
 * Smooth caret input — the native caret is hidden and replaced by a spring
 * driven caret that glides to the typing position and rolls away on blur.
 * Supports the same props as a plain <input> (controlled or uncontrolled).
 */
const SmoothInput = React.forwardRef<HTMLInputElement, SmoothInputProps>(
  function SmoothInput(
    {
      className,
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      onBlur,
      type = "text",
      placeholder,
      style,
      fontSize,
      ...props
    }: SmoothInputProps,
    forwardedRef
  ) {
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const caretX = useMotionValue(0);
    const caretOpacity = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const isControlled = value !== undefined;

    const springCaretX = useSpring(
      caretX,
      prefersReducedMotion
        ? { stiffness: 10000, damping: 100, mass: 0.1 }
        : { stiffness: 500, damping: 30, mass: 0.5 }
    );

    const springCaretOpacity = useSpring(
      caretOpacity,
      prefersReducedMotion
        ? { stiffness: 10000, damping: 100 }
        : { stiffness: 500, damping: 38 }
    );

    const inputValue = isControlled ? String(value) : internalValue;
    const activeType = type;
    const displayPlaceholder = placeholder ?? "";

    const syncMeasureSpan = () => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return;

      const styles = window.getComputedStyle(input);
      const isPassword = input.type === "password";

      let inputFontSize = styles.fontSize;
      if (
        PASSWORD_CHAR === "\u2022" &&
        isPassword &&
        !navigator.userAgent.match(/chrome|chromium|crios/i)
      ) {
        inputFontSize = `${parseFloat(inputFontSize) + 6.25}px`;
      }

      measureSpan.style.font = `${styles.fontStyle} ${styles.fontWeight} ${inputFontSize} ${styles.fontFamily}`;
      measureSpan.style.letterSpacing = styles.letterSpacing;
      measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings;
      measureSpan.style.fontVariationSettings = styles.fontVariationSettings;
    };

    const measurePrefixWidth = (text: string) => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return null;

      syncMeasureSpan();
      measureSpan.textContent = text;

      const paddingLeft =
        parseFloat(window.getComputedStyle(input).paddingLeft) || 0;

      return text.length > 0
        ? measureSpan.offsetWidth + paddingLeft
        : paddingLeft - 1;
    };

    const scrollCaretIntoView = (
      target: HTMLInputElement,
      absoluteWidth: number
    ) => {
      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
      const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
      const visibleLeft = target.scrollLeft + paddingLeft;

      if (absoluteWidth > visibleRight) {
        target.scrollLeft = Math.min(
          absoluteWidth - target.clientWidth + paddingRight,
          maxScroll
        );
        return;
      }

      if (absoluteWidth < visibleLeft) {
        target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
      }
    };

    const getCaretIndex = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;

      if (selectionStart === selectionEnd) {
        return selectionStart;
      }

      return target.selectionDirection === "backward"
        ? selectionStart
        : selectionEnd;
    };

    const updateCaretFromInput = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;
      const caretIndex = getCaretIndex(target);
      const isPassword = target.type === "password";
      const textBeforeCaret = isPassword
        ? PASSWORD_CHAR.repeat(caretIndex)
        : target.value.slice(0, caretIndex);

      const absoluteWidth = measurePrefixWidth(textBeforeCaret);
      if (absoluteWidth === null) return;

      scrollCaretIntoView(target, absoluteWidth);

      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const caretPosition = absoluteWidth - target.scrollLeft;
      const minX = paddingLeft - 1;
      const maxX = target.clientWidth - paddingRight;
      const isCaretVisible =
        caretPosition >= minX && caretPosition <= maxX + 1;

      caretX.set(Math.min(caretPosition, maxX));

      if (!isCaretVisible || hasSelection) {
        caretOpacity.set(0);
        return;
      }

      caretOpacity.set(1);
    };

    const updateCaretRef = useRef(updateCaretFromInput);
    updateCaretRef.current = updateCaretFromInput;
    const caretOpacityRef = useRef(caretOpacity);
    caretOpacityRef.current = caretOpacity;
    const caretXRef = useRef(caretX);
    caretXRef.current = caretX;

    const rollAway = (target: HTMLInputElement) => {
      const styles = window.getComputedStyle(target);
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      caretXRef.current.set(target.clientWidth - paddingRight + 8);
      caretOpacityRef.current.set(0);
    };

    useEffect(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) {
        updateCaretRef.current(input);
      }
    }, [inputValue]);

    useEffect(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) {
        updateCaretRef.current(input);
      }
    }, [activeType, fontSize]);

    useEffect(() => {
      const input = inputRef.current;
      const container = containerRef.current;
      if (!input || !container) return;

      const updateCaretIfFocused = () => {
        if (document.activeElement === input) {
          updateCaretRef.current(input);
        }
      };

      const handleSelectionChange = () => {
        if (document.activeElement !== input) return;

        requestAnimationFrame(() => {
          if (document.activeElement === input) {
            updateCaretRef.current(input);
          }
        });
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      if (document.fonts) {
        document.fonts.addEventListener("loadingdone", updateCaretIfFocused);
        void document.fonts.ready.then(updateCaretIfFocused);
      }
      input.addEventListener("scroll", updateCaretIfFocused);

      const resizeObserver = new ResizeObserver(updateCaretIfFocused);
      resizeObserver.observe(container);

      updateCaretIfFocused();

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        if (document.fonts) {
          document.fonts.removeEventListener(
            "loadingdone",
            updateCaretIfFocused
          );
        }
        input.removeEventListener("scroll", updateCaretIfFocused);
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div
        className={cn(
          "relative w-full has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary/40",
          wrapperClassName
        )}
      >
        <div
          ref={containerRef}
          className="relative grid grid-cols-1 p-0 overflow-hidden"
          style={{ caretColor: "transparent", fontSize }}
        >
          <input
            {...props}
            ref={(node) => {
              inputRef.current = node;
              if (typeof forwardedRef === "function") forwardedRef(node);
              else if (forwardedRef) forwardedRef.current = node;
            }}
            type={activeType}
            placeholder={displayPlaceholder}
            data-cgs-smooth-caret="true"
            className={cn(
              inputClassName,
              "col-start-1 col-end-2 row-start-1 row-end-2 text-inherit",
              className
            )}
            style={style}
            value={inputValue}
            onChange={(e) => {
              if (!isControlled) setInternalValue(e.target.value);
              onChange?.(e);
              requestAnimationFrame(() => {
                updateCaretRef.current(e.target);
              });
            }}
            onBlur={(e) => {
              rollAway(e.target);
              onBlur?.(e);
            }}
          />
          <span
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute top-0 left-0 whitespace-pre"
          />
          <motion.div
            className="bg-primary pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 h-[0.9em] w-0.5 self-center"
            style={{ x: springCaretX, opacity: springCaretOpacity }}
          />
        </div>
      </div>
    );
  }
);

export { Input, SmoothInput };
