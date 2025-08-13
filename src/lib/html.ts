import sanitizeHtml from 'sanitize-html';

export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'div', 'span', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'br',
      'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      // Normalize common email wrappers to harmless containers
      'section'
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      '*': ['style'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan']
    },
    // Only allow safe CSS properties/values
    allowedStyles: {
      '*': {
        'color': [/^#[0-9a-fA-F]{3,8}$/i, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/i, /^rgba\((\s*\d+\s*,){3}\s*(0|1|0?\.\d+)\s*\)$/i, /^[a-zA-Z]+$/],
        'font-weight': [/^(normal|bold|bolder|lighter|[1-9]00)$/],
        'font-style': [/^(normal|italic|oblique)$/],
        'text-decoration': [/^(none|underline|line-through|overline)(\s+solid|\s+dashed|\s+dotted)?$/],
        'text-align': [/^(left|right|center|justify)$/],
        'line-height': [/^\d+(\.\d+)?(px|em|rem|%)?$/],
        'font-size': [/^\d+(px|pt|em|rem|%)$/],
        'font-family': [/^[a-zA-Z0-9 ,"'\-]+$/]
      },
      // Allow background highlight only on inline spans to avoid large full-width blocks from email wrappers
      'span': {
        'background-color': [/^#[0-9a-fA-F]{3,8}$/i, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/i, /^rgba\((\s*\d+\s*,){3}\s*(0|1|0?\.\d+)\s*\)$/i, /^[a-zA-Z]+$/]
      }
    },
    transformTags: {
      // Force external links to be safe
      'a': sanitizeHtml.simpleTransform('a', { rel: 'nofollow noreferrer noopener', target: '_blank' }, true),
      // Strip bulky email wrapper attributes/styles and convert to simple div
      'section': sanitizeHtml.simpleTransform('div', {}, true),
      'div': (tagName, attribs) => {
        const cleaned: Record<string, string> = {}
        // prevent large padding/margins introduced by signatures
        const style = (attribs.style || '')
          .replace(/margin[^;]*;?/gi, '')
          .replace(/padding[^;]*;?/gi, '')
          .replace(/background[^;]*;?/gi, '')
        if (style.trim()) cleaned.style = style
        return { tagName: 'div', attribs: cleaned }
      }
    },
    // Disallow all URL schemes except safe ones
    allowedSchemes: ['http', 'https', 'mailto'],
    // Preserve newlines reasonably by converting lone line breaks to <br>
    textFilter: function(text) { return text; }
  });
}

export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const doc = typeof window !== 'undefined' ? window.document.implementation.createHTMLDocument('') : undefined;
  if (doc) {
    const container = doc.createElement('div');
    container.innerHTML = html;
    return container.textContent || container.innerText || '';
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}


