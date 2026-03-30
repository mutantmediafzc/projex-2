"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-32 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
  ),
});

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
};

function isEmptyHtml(html: string): boolean {
  if (!html) return true;
  const stripped = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return stripped.length === 0;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  minHeight = "100px",
}: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["clean"],
      ],
    }),
    []
  );

  const formats = ["bold", "italic", "underline", "list", "bullet"];

  const handleChange = (content: string) => {
    // If content is empty HTML like <p><br></p>, convert to empty string
    if (isEmptyHtml(content)) {
      onChange("");
    } else {
      onChange(content);
    }
  };

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <style jsx global>{`
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
          border-color: rgb(226 232 240);
          font-size: 0.875rem;
          min-height: ${minHeight};
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
          border-color: rgb(226 232 240);
          background: rgb(248 250 252);
        }
        .rich-text-editor .ql-editor {
          min-height: ${minHeight};
          color: black;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: rgb(148 163 184);
          font-style: normal;
        }
        .rich-text-editor .ql-container:focus-within {
          border-color: rgb(244 114 182);
        }
        .rich-text-editor .ql-toolbar.ql-snow + .ql-container.ql-snow {
          border-top: 0;
        }
      `}</style>
    </div>
  );
}
