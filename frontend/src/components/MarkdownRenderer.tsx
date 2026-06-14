import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split lines to build structured elements
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inList = false;
  let listItems: string[] = [];

  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    // Basic regex parser for bold text (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900 dark:text-teal-200">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderCollectedList = (key: number) => {
    if (listItems.length === 0) return null;
    const items = [...listItems];
    listItems = [];
    inList = false;
    return (
      <ul key={`list-${key}`} className="list-disc pl-5 my-3.5 space-y-1.5 text-slate-600 dark:text-slate-350">
        {items.map((item, idx) => (
          <li key={idx} className="text-xs leading-relaxed">
            {parseInlineMarkdown(item)}
          </li>
        ))}
      </ul>
    );
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Check for lists
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || /^(\d+)\.\s/.test(trimmedLine)) {
      if (!inList) {
        // Render any previous block, though lists are usually separated
        inList = true;
      }
      // Remove bullet indicator
      const text = trimmedLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      listItems.push(text);
      return;
    }

    // If we were in a list, but this line is not a list item, flush the list
    if (inList && trimmedLine === '') {
      elements.push(renderCollectedList(index));
    }

    // Headings
    if (trimmedLine.startsWith('### ')) {
      if (inList) elements.push(renderCollectedList(index));
      elements.push(
        <h4 key={index} className="text-sm font-bold text-teal-700 dark:text-teal-400 mt-5 mb-2 uppercase tracking-wide">
          {parseInlineMarkdown(trimmedLine.slice(4))}
        </h4>
      );
    } else if (trimmedLine.startsWith('## ')) {
      if (inList) elements.push(renderCollectedList(index));
      elements.push(
        <h3 key={index} className="text-base font-bold text-slate-800 dark:text-teal-300 mt-6 mb-2.5">
          {parseInlineMarkdown(trimmedLine.slice(3))}
        </h3>
      );
    } else if (trimmedLine.startsWith('# ')) {
      if (inList) elements.push(renderCollectedList(index));
      elements.push(
        <h2 key={index} className="text-lg font-bold text-slate-900 dark:text-white mt-7 mb-3 border-b border-teal-100/50 dark:border-teal-900 pb-1">
          {parseInlineMarkdown(trimmedLine.slice(2))}
        </h2>
      );
    } else if (trimmedLine === '') {
      // Small spacing spacer
      if (inList) elements.push(renderCollectedList(index));
      elements.push(<div key={`spacer-${index}`} className="h-2" />);
    } else {
      if (inList) elements.push(renderCollectedList(index));
      elements.push(
        <p key={index} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed my-2">
          {parseInlineMarkdown(trimmedLine)}
        </p>
      );
    }
  });

  // Flush any final list if file ends in list
  if (inList) {
    elements.push(renderCollectedList(lines.length));
  }

  return <div className="markdown-render-block space-y-1.5">{elements}</div>;
}
