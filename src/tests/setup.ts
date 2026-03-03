// Extend vitest's expect with jest-dom matchers (for DOM assertions like toBeInTheDocument).
// This is the correct setup when globals: false — we must extend explicitly.
import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);
