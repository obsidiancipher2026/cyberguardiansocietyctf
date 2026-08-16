import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Duotone Base Palette */
        void: "#05060A",
        "void-2": "#0D0F16",
        "void-3": "#12151F",
        "void-4": "#1A1E2C",

        /* Electric Red (Action/Offense/Alert) */
        primary: "#FF1744",
        "primary-glow": "#FF5C7A",
        "primary-deep": "#A3001F",
        "primary-light": "#FF8FA3",

        /* Electric Blue (Trust/Defense/Verified) */
        secondary: "#00B4FF",
        "secondary-glow": "#66CFFF",
        "secondary-deep": "#005C8A",
        "secondary-light": "#A8E4FF",

        /* Violet Bridge — red→blue gradient mid */
        violet: "#7A5CFF",

        /* Remapped Semantics (Electric Red/Blue identity) */
        success: "#00B4FF", // Electric Blue for verified/success
        "success-glow": "#66CFFF",
        danger: "#FF1744", // Electric Red
        "danger-glow": "#FF5C7A",
        warning: "#FF6B6B", // Red tint (difficulty / attention)
        "warning-glow": "#FF9A9A",

        /* Neutrals */
        ink: "#F5F6FA",
        "ink-2": "#D0D4E4",
        muted: "#B9BFD4",
        "muted-2": "#626982",
        hairline: "rgba(35, 40, 58, 0.5)",

        /* Difficulty Tiers */
        "diff-easy": "#66CFFF",
        "diff-medium": "#7A5CFF",
        "diff-hard": "#FF7043",
        "diff-insane": "#FF1744",

        /* Strict Domain Color Mapping */
        "cat-web": "#00B4FF",      // Electric Blue
        "cat-pwn": "#FF1744",      // Electric Red
        "cat-crypto": "#7A5CFF",   // Violet bridge
        "cat-forensics": "#66CFFF", // Light blue
        "cat-reversing": "#FF5C7A", // Red tint
        "cat-osint": "#54C4FF",    // Sky
        "cat-misc": "#8A7BFF",     // Soft bridge
      },
      fontFamily: {
        display: ["Cabinet Grotesk", "Space Grotesk", "system-ui", "sans-serif"],
        heading: ["Cabinet Grotesk", "Space Grotesk", "system-ui", "sans-serif"],
        body: ["Poppins", "system-ui", "sans-serif"],
        sans: ["Poppins", "system-ui", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.55)",
        "glass-lg": "0 14px 50px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glow-red": "0 0 28px rgba(0,229,153,0.3)",
        "glow-red-lg": "0 0 48px rgba(0,229,153,0.5), 0 0 80px rgba(0,229,153,0.3)",
        "glow-blue": "0 0 28px rgba(255,197,61,0.3)",
        "glow-purple": "0 0 28px rgba(0,198,232,0.3)",
        "glow-amber": "0 0 28px rgba(255,209,102,0.3)",
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
