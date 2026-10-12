import React, { useState } from 'react';
import styles from './MarkdownView.module.css';

/**
 * Custom High-Performance & Secure Markdown Renderer
 * Supports:
 * - Interactive Checklists (- [ ] and - [x]) with live toggle callback
 * - Code blocks with copy-to-clipboard button and language badge
 * - Headings (h1, h2, h3, h4)
 * - Blockquotes
 * - Lists (ordered and unordered)
 * - Horizontal rules
 * - Inline formatting (bold, italic, strikethrough, inline code, links)
 */
export const MarkdownView = ({ content = '', onToggleChecklist }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopyCode = async (codeSnippet, index) => {
    try {
      await navigator.clipboard.writeText(codeSnippet);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  // Parse lines into tokens
  const lines = (content || '').split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines = [];
  let codeBlockIndex = 0;

  let checklistItemCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block start / end
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const snippet = codeBlockLines.join('\n');
        const currentIndex = codeBlockIndex++;
        const lang = codeBlockLang || 'code';

        elements.push(
          <div key={`codeblock-${i}`} className={styles.codeBlockWrapper}>
            <div className={styles.codeBlockHeader}>
              <span className={styles.codeLang}>{lang}</span>
              <button
                type="button"
                className={styles.copyCodeBtn}
                onClick={() => handleCopyCode(snippet, currentIndex)}
                title="Copy code"
              >
                {copiedIndex === currentIndex ? (
                  <>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className={styles.codePre}>
              <code>{snippet}</code>
            </pre>
          </div>
        );

        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className={styles.divider} />);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className={styles.h1}>
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className={styles.h2}>
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className={styles.h3}>
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className={styles.h4}>
          {renderInline(line.slice(5))}
        </h4>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      elements.push(
        <blockquote key={`quote-${i}`} className={styles.blockquote}>
          {renderInline(line.replace(/^>\s?/, ''))}
        </blockquote>
      );
      continue;
    }

    // Interactive Checklist: - [ ] or - [x]
    const checkMatch = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      const isChecked = checkMatch[1].toLowerCase() === 'x';
      const itemText = checkMatch[2];
      const targetIndex = checklistItemCounter++;

      elements.push(
        <div key={`check-${i}`} className={styles.checklistRow}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleChecklist && onToggleChecklist(targetIndex)}
              className={styles.checkboxInput}
            />
            <span className={`${styles.checkCustom} ${isChecked ? styles.checkCustomChecked : ''}`}>
              {isChecked && (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </label>
          <span className={`${styles.checkText} ${isChecked ? styles.checkTextDone : ''}`}>
            {renderInline(itemText)}
          </span>
        </div>
      );
      continue;
    }

    // Unordered list: - item or * item
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (ulMatch) {
      elements.push(
        <div key={`ul-${i}`} className={styles.bulletRow}>
          <span className={styles.bulletDot}>•</span>
          <span className={styles.listItemText}>{renderInline(ulMatch[1])}</span>
        </div>
      );
      continue;
    }

    // Ordered list: 1. item
    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (olMatch) {
      elements.push(
        <div key={`ol-${i}`} className={styles.numberedRow}>
          <span className={styles.numberBadge}>{olMatch[1]}.</span>
          <span className={styles.listItemText}>{renderInline(olMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Empty line / paragraph spacer
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className={styles.emptySpacer} />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`} className={styles.paragraph}>
        {renderInline(line)}
      </p>
    );
  }

  // If code block unclosed at end
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <div key="unclosed-code" className={styles.codeBlockWrapper}>
        <pre className={styles.codePre}>
          <code>{codeBlockLines.join('\n')}</code>
        </pre>
      </div>
    );
  }

  return <div className={styles.markdownContainer}>{elements}</div>;
};

/**
 * Parses inline formatting:
 * Bold (**text**), Italic (*text*), Strikethrough (~~text~~),
 * Inline code (`code`), Link ([text](url))
 */
function renderInline(text) {
  if (!text) return null;

  // Split into tokens using regex
  const parts = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // 1. Inline code: `...`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={`incode-${keyIndex++}`} className={styles.inlineCode}>
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 2. Bold: **...** or __...__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      parts.push(
        <strong key={`bold-${keyIndex++}`} className={styles.boldText}>
          {renderInline(boldMatch[2])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 3. Strikethrough: ~~...~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      parts.push(
        <del key={`strike-${keyIndex++}`} className={styles.strikethrough}>
          {renderInline(strikeMatch[1])}
        </del>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 4. Italic: *...* or _..._
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      parts.push(
        <em key={`italic-${keyIndex++}`} className={styles.italicText}>
          {renderInline(italicMatch[2])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 5. Link: [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const url = linkMatch[2];
      const isSafe = /^https?:\/\//i.test(url);
      parts.push(
        <a
          key={`link-${keyIndex++}`}
          href={isSafe ? url : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Plain text up to next special char
    const nextSpecial = remaining.search(/[`*_~\[]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Unmatched special char, take 1 char
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts;
}
