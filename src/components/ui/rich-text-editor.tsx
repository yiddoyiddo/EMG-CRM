'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { sanitizeEmailHtml } from '@/lib/html'
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Heading3, Undo2, Redo2, Eraser } from 'lucide-react'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  heightClassName?: string
}

export function RichTextEditor({ value, onChange, placeholder, className, heightClassName }: RichTextEditorProps) {
  const [internal, setInternal] = useState<string>(value || '')
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setInternal(value || '')
  }, [value])

  const focusEditor = useCallback(() => {
    if (!ref.current) return
    ref.current.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount === 0) {
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }, [])

  const exec = useCallback((command: string, valueArg?: string) => {
    focusEditor()
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(command, false, valueArg)
  }, [focusEditor])

  const handleInput = useCallback(() => {
    if (!ref.current) return
    // Do NOT sanitize on every keystroke; it interferes with caret movement and backspace.
    const html = ref.current.innerHTML
    setInternal(html)
    onChange(html)
  }, [onChange])

  const plainTextToHtml = useCallback((text: string) => {
    const normalized = text
      .replace(/\r/g, '')
      .replace(/[\t\u00A0]+/g, ' ') // tabs & nbsp -> space
      .trim()
    const paragraphs = normalized
      .split(/\n{2,}/)
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('')
    return paragraphs || ''
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const fromHtml = e.clipboardData.getData('text/html')
    const fromText = e.clipboardData.getData('text/plain')
    const rawHtml = fromHtml && fromHtml.length > 0 ? fromHtml : plainTextToHtml(fromText)
    const sanitized = sanitizeEmailHtml(rawHtml)
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand('insertHTML', false, sanitized)
    setTimeout(handleInput, 0)
  }, [handleInput, plainTextToHtml])

  const handleBlur = useCallback(() => {
    if (!ref.current) return
    const sanitized = sanitizeEmailHtml(ref.current.innerHTML)
    // Only update if changed to avoid unnecessary selection resets
    if (sanitized !== internal) {
      ref.current.innerHTML = sanitized
      setInternal(sanitized)
      onChange(sanitized)
    }
  }, [internal, onChange])

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-wrap items-center gap-1 mb-2 sticky top-0 bg-background/80 backdrop-blur z-10 py-1">
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('italic')} title="Italic"><Italic className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('underline')} title="Underline"><Underline className="h-4 w-4" /></Button>
        <span className="mx-1" />
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('insertUnorderedList')} title="Bulleted list"><List className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered className="h-4 w-4" /></Button>
        <span className="mx-1" />
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('formatBlock', 'h1')} title="Heading 1"><Heading1 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('formatBlock', 'h2')} title="Heading 2"><Heading2 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('formatBlock', 'h3')} title="Heading 3"><Heading3 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => {
          const url = window.prompt('Enter URL') || ''
          if (url) exec('createLink', url)
        }} title="Insert link"><LinkIcon className="h-4 w-4" /></Button>
        <span className="mx-1" />
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('undo')} title="Undo"><Undo2 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('redo')} title="Redo"><Redo2 className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => exec('removeFormat')} title="Clear formatting"><Eraser className="h-4 w-4" /></Button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[200px] max-h-[60vh] overflow-auto break-words',
          heightClassName
        )}
        data-placeholder={placeholder || ''}
        onInput={handleInput}
        onPaste={handlePaste}
        onBlur={handleBlur}
        dangerouslySetInnerHTML={{ __html: internal }}
      />
    </div>
  )
}

export default RichTextEditor


