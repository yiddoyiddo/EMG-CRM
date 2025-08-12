"use client";
import React from "react";

// Minimal emoji picker to avoid heavy deps and peer conflicts.
// Provides a small grid of commonly used emojis and calls onSelect with the selected emoji.

const COMMON_EMOJIS = [
  "😀","😁","😂","🤣","😊","😍","😘","😎","🤔","😐","😴","😢","😡","👍","👏","🙌","🙏","💯","🔥","✨","🎉","❤️","💔","✅","❌"
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: { native: string }) => void }) {
  return (
    <div className="p-2 w-64 grid grid-cols-8 gap-1">
      {COMMON_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent"
          onClick={() => onSelect({ native: e })}
        >
          <span className="text-lg leading-none">{e}</span>
        </button>
      ))}
    </div>
  );
}


