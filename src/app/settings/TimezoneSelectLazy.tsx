"use client";

// Thin wrapper so the heavy react-timezone-select package (~160 kB, ships a
// full tz database) can be code-split with next/dynamic. Dynamic-importing a
// local module avoids the package's export-map quirk (it only defines an
// "import" condition, which webpack's bare dynamic import rejects).
export { default } from "react-timezone-select";
