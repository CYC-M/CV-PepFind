import React, { useState } from "react";
import { PeptideVisualizationModal } from "./PeptideVisualizationModal";

interface PeptideLinkProps {
  sequence: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Clickable peptide sequence link that opens visualization modal
 */
export function PeptideLink({ sequence, className = "", children }: PeptideLinkProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Validate sequence
  const isValidSequence = /^[ACDEFGHIKLMNPQRSTVWY]{3,100}$/i.test(sequence);

  if (!isValidSequence) {
    return <span className={className}>{children || sequence}</span>;
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`cursor-pointer text-blue-600 hover:text-blue-800 hover:underline font-mono transition-colors ${className}`}
        title={`点击查看 ${sequence} 的可视化`}
      >
        {children || sequence}
      </button>
      <PeptideVisualizationModal
        isOpen={isModalOpen}
        sequence={sequence.toUpperCase()}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

/**
 * Parse text and render peptide sequences as clickable links
 */
export function PeptideTextParser({ text }: { text: string }) {
  const sequenceRegex = /[ACDEFGHIKLMNPQRSTVWY]{3,100}/gi;
  const parts: Array<{
    type: "text" | "sequence";
    content: string;
  }> = [];

  let lastIndex = 0;
  let match;

  const regex = new RegExp(sequenceRegex);

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
      });
    }

    parts.push({
      type: "sequence",
      content: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  if (parts.length === 0) {
    return <span>{text}</span>;
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.type === "sequence" ? (
          <PeptideLink key={i} sequence={part.content} />
        ) : (
          <span key={i}>{part.content}</span>
        )
      )}
    </span>
  );
}

/**
 * Wrapper for rendering content with peptide links
 */
export function PeptideContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <PeptideTextParser text={content} />
    </div>
  );
}
