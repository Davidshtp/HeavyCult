"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Underline from "@tiptap/extension-underline";
import {
  BoldIcon,
  Code2Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  RedoIcon,
  StrikethroughIcon,
  TextIcon,
  TypeIcon,
  UnderlineIcon,
  UndoIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/ui/toolbar";
import { Tooltip } from "@/components/ui/tooltip";
import { EDITOR_PROSE } from "@/components/dashboard/productos/editor-prose";
import { sanearHtml } from "@/lib/html";

/**
 * `StarterKit.configure({ code: false, codeBlock: false })` queda dentro de lo
 * que `html.ts` permite y elimina los `<code>` que no queremos en descripciones
 * de producto. `Underline` va explícito aunque StarterKit lo trae, pero lo
 * mantenemos predecible con la barra.
 */
const EXTENSIONES = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: false,
    },
  }),
  Underline,
  Placeholder.configure({
    placeholder: "Escribí la descripción del producto...",
    emptyNodeClass: "is-editor-empty",
  }),
];

interface EditorDescripcionProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

export function EditorDescripcion({
  value,
  onChange,
  className,
}: EditorDescripcionProps) {
  const [verHtml, setVerHtml] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDialog, setLinkDialog] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const ultimoHtmlRef = useRef<string>(value);

  const editor = useEditor({
    extensions: EXTENSIONES,
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${EDITOR_PROSE} focus:outline-none min-h-[200px] px-1 py-2 [&_.is-editor-empty:first-child::before]:content-['Escribí_la_descripción_del_producto...'] [&_.is-editor-empty:first-child::before]:text-white/30 [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const limpio = sanearHtml(html);
      const normalizado = limpio.trim() === "<p></p>" ? "" : limpio;
      ultimoHtmlRef.current = normalizado;
      onChange(normalizado);
    },
  });

  // Si el `value` externo cambia fuera del editor (cambiar de producto), se
  // reinicia para reflejar ese valor. `useEffect` mínimo y correcto.
  useEffect(() => {
    if (!editor) return;
    if (value === ultimoHtmlRef.current) return;
    ultimoHtmlRef.current = value;
    editor.commands.setContent(value || "<p></p>", {
      emitUpdate: false,
    });
  }, [editor, value]);

  const estado = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        blockquote: editor.isActive("blockquote"),
        h1: editor.isActive("heading", { level: 1 }),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        paragraph: editor.isActive("paragraph") && !editor.isActive("heading"),
        link: editor.isActive("link"),
      };
    },
  });

  const es = estado ?? {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    h1: false,
    h2: false,
    h3: false,
    paragraph: true,
    link: false,
  };

  function abrirLink() {
    if (!editor) return;
    const anterior = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(anterior ?? "");
    setLinkDialog(true);
    // En el próximo ciclo el input ya está en DOM
    setTimeout(() => linkInputRef.current?.focus(), 50);
  }

  function aplicarLink(e: React.FormEvent) {
    e.preventDefault();
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      // Usa http:// por defecto si no trae protocolo.
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href })
        .run();
    }
    setLinkDialog(false);
    setLinkUrl("");
  }

  const htmlCrudo = verHtml ? value : "";

  return (
    <div className={className}>
      <Toolbar className="mb-2">
        <ToolbarGroup>
          <Tooltip
            label="Párrafo"
            atajo="Ctrl+Alt+0"
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.paragraph}
                onClick={() => editor?.chain().focus().setParagraph().run()}
              >
                <TextIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Título 1"
            atajo="Ctrl+Alt+1"
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.h1}
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 1 }).run()
                }
              >
                <Heading1Icon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Título 2"
            atajo="Ctrl+Alt+2"
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.h2}
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run()
                }
              >
                <Heading2Icon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Título 3"
            atajo="Ctrl+Alt+3"
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.h3}
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level: 3 }).run()
                }
              >
                <Heading3Icon className="size-3.5" />
              </ToolbarButton>
            }
          />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <Tooltip
            label="Negrita"
            atajo="Ctrl+B"
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.bold}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <BoldIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Cursiva"
            atajo="Ctrl+I"
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.italic}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <ItalicIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Subrayado"
            atajo="Ctrl+U"
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.underline}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Tachado"
            atajo=""
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.strike}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
              >
                <StrikethroughIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <Tooltip
            label="Lista con viñetas"
            atajo=""
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.bulletList}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <ListIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Lista numerada"
            atajo=""
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.orderedList}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              >
                <ListOrderedIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Cita"
            atajo=""
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={es.blockquote}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              >
                <QuoteIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Línea horizontal"
            atajo=""
            trigger={
              <ToolbarButton
                type="button"
                onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              >
                <MinusIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          {linkDialog ? (
            <form
              className="flex items-center gap-1.5 px-1"
              onSubmit={aplicarLink}
              onBlur={(e) => {
                // No cerrar si el blur es por cambiar a otro input/botón
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setLinkDialog(false);
              }}
            >
              <Input
                ref={linkInputRef}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="h-7 w-48 text-xs"
              />
              <Button type="submit" size="sm" variant="secondary">
                Listo
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setLinkDialog(false)}
                aria-label="Cerrar"
              >
                <XIcon className="size-3.5" />
              </Button>
            </form>
          ) : (
            <Tooltip
              label="Enlace"
              atajo=""
              trigger={
                <ToolbarButton
                  type="button"
                  aria-pressed={es.link}
                  onClick={abrirLink}
                >
                  <Link2Icon className="size-3.5" />
                </ToolbarButton>
              }
            />
          )}
          <Tooltip
            label="Limpiar formato"
            atajo=""
            trigger={
              <ToolbarButton
                type="button"
                onClick={() =>
                  editor
                    ?.chain()
                    .focus()
                    .unsetBold()
                    .unsetItalic()
                    .unsetUnderline()
                    .unsetStrike()
                    .unsetLink()
                    .clearNodes()
                    .run()
                }
              >
                <TypeIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <Tooltip
            label="Deshacer"
            atajo="Ctrl+Z"
            trigger={
              <ToolbarButton
                type="button"
                onClick={() => editor?.chain().focus().undo().run()}
              >
                <UndoIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Rehacer"
            atajo="Ctrl+Y / Ctrl+Shift+Z"
            trigger={
              <ToolbarButton
                type="button"
                onClick={() => editor?.chain().focus().redo().run()}
              >
                <RedoIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <Tooltip
            label="Ver / Editar HTML"
            atajo=""
            trigger={
              <ToolbarButton
                type="button"
                aria-pressed={verHtml}
                onClick={() => setVerHtml((v) => !v)}
              >
                <Code2Icon className="size-3.5" />
              </ToolbarButton>
            }
          />
        </ToolbarGroup>
      </Toolbar>

      {verHtml ? (
        <textarea
          value={htmlCrudo}
          onChange={(e) => {
            const raw = e.target.value;
            // Actualiza el estado externo tal cual: el diff sigue comparando y
            // `sanearHtml` ya se aplica al volver a guardar. También refrescamos
            // el ref para que el efecto no sobreescriba el valor justo después.
            ultimoHtmlRef.current = raw;
            onChange(raw);
          }}
          rows={12}
          spellCheck={false}
          className="w-full rounded-md border border-white/10 bg-transparent p-2 font-mono text-xs text-white/85 outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
        />
      ) : (
        <div className="rounded-md border border-white/10 bg-white/[0.01] p-1">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
