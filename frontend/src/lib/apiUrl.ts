export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin.includes("localhost:3000")
      ? "http://localhost:4000/api"
      : "/api"
    : process.env.NODE_ENV === "production"
    ? "/api"
    : "http://localhost:4000/api");
