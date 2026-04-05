// frontend/app/config.ts

// Centralize your API base URL.
// Always import { API_BASE } from "@/app/config" to use your backend endpoint root.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";
