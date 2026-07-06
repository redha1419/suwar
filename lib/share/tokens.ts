import "server-only";
import { customAlphabet } from "nanoid";

// URL-safe alphabet, 24 chars ≈ 142 bits of entropy — brute-forcing a token is impractical.
const generate = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  24
);

export function generateShareToken(): string {
  return generate();
}
