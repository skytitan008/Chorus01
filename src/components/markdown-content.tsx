"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

export function MarkdownContent({ children }: { children: string }) {
  return <Streamdown plugins={{ code }}>{children}</Streamdown>;
}
