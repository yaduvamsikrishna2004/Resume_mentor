import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileUp } from "lucide-react";

function FileDropzone({ onFileSelect, isLoading }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files) {
    const [file] = files || [];
    if (!file) {
      return;
    }
    onFileSelect(file);
  }

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`glass-card relative cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
        isDragging ? "border-accent bg-accent/15" : "border-cyan-100/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={isLoading}
      />
      <div className="mx-auto mb-4 inline-flex rounded-2xl bg-cyan-100/15 p-3 text-accent">
        <FileUp size={26} />
      </div>
      <p className="font-display text-2xl text-white">Drop resume here</p>
      <p className="mt-2 text-cyan-100">or click to upload PDF/DOCX</p>
      <p className="mt-6 text-xs uppercase tracking-widest text-cyan-100/70">
        {isLoading ? "Uploading and parsing..." : "Production-ready parser + NLP pipeline"}
      </p>
    </motion.div>
  );
}

export default FileDropzone;
