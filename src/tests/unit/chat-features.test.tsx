import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatMessageContent, MarkdownRenderer } from "@/components/chat-message-content";

describe("Chat Multi-Modal & Thinking Features", () => {
  it("renders regular text properly", () => {
    render(<ChatMessageContent content="Halo dari ER-AI" role="assistant" />);
    expect(screen.getByText("Halo dari ER-AI")).toBeDefined();
  });

  it("extracts and renders thinking process tag properly", () => {
    const rawContent = "<think>Ini adalah analisa arsitektur internal</think>Berikut solusi implementasinya.";
    render(<ChatMessageContent content={rawContent} role="assistant" />);
    
    // Thinking accordion button should exist
    expect(screen.getByText("Proses Berpikir (Thinking)")).toBeDefined();
    // Answer text should exist
    expect(screen.getByText("Berikut solusi implementasinya.")).toBeDefined();
  });

  it("renders code blocks with language badge and copy action", () => {
    const codeContent = "```typescript\nconst message: string = 'Hello World';\n```";
    render(<MarkdownRenderer content={codeContent} />);
    
    expect(screen.getByText(/typescript/i)).toBeDefined();
    expect(screen.getByText("Salin")).toBeDefined();
  });

  it("renders attached images for vision models", () => {
    render(
      <ChatMessageContent
        content="Lihat gambar ini"
        role="user"
        images={["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="]}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toBeDefined();
  });
});
