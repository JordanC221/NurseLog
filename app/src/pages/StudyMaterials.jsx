import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, FolderOpen, Loader2, Upload } from "lucide-react";
import { nurselog } from "@/api/client";
import { persistStudySet } from "@/lib/study";
import CenteredState from "@/components/study/CenteredState";
import MaterialCard from "@/components/study/MaterialCard";

const KINDS = [
  { value: "outline", label: "Course outline" },
  { value: "slides", label: "Lecture slides" },
  { value: "handout", label: "Handout" },
  { value: "notes", label: "My notes" },
  { value: "other", label: "Other" },
];
const MAX_BYTES = 20 * 1024 * 1024;
const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none";

export default function StudyMaterials() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [kind, setKind] = useState("outline");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMaterials(await nurselog.entities.StudyMaterial.list("-created_date", 100));
    } catch (e) {
      console.error("materials load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload() {
    setFormError("");
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setFormError("Choose a file to upload first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFormError("That file is too large. Please keep uploads under 20 MB.");
      return;
    }

    setUploading(true);
    try {
      const { file_uri } = await nurselog.integrations.Core.UploadPrivateFile({ file });
      await nurselog.entities.StudyMaterial.create({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        course: course.trim(),
        kind,
        file_name: file.name,
        file_uri,
        status: "uploaded",
      });
      setTitle("");
      setCourse("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setFormError(e?.message || "That upload did not go through. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function generate(material) {
    setBusyId(material.id);
    setErrors((prev) => ({ ...prev, [material.id]: "" }));
    try {
      const res = await nurselog.functions.invoke("generateStudySet", {
        mode: "material",
        material: {
          title: material.title,
          kind: material.kind,
          file_name: material.file_name,
          file_uri: material.file_uri,
        },
      });
      const data = res.data || {};
      if (data.error) throw new Error(data.error);

      const set = await persistStudySet(data, {
        sourceType: "material",
        topic: material.title,
      });

      await nurselog.entities.StudyMaterial.update(material.id, {
        status: "ready",
        set_id: set.id,
        summary: data.summary || "",
        topics: data.topics || [],
        card_count: (data.cards || []).length,
      });
      await load();
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [material.id]:
          e?.response?.data?.error || e?.message || "Something went wrong. Please try again.",
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(material) {
    await nurselog.entities.StudyMaterial.delete(material.id);
    setMaterials((prev) => prev.filter((item) => item.id !== material.id));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/study")} className="p-2 rounded-lg bg-slate-100">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Course Materials</h1>
          <p className="text-xs text-slate-500">Turn outlines & slides into study sets</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600 active:scale-[0.99] transition"
        >
          <Upload size={17} />
          {fileName || "Choose a file"}
        </button>
        <p className="text-[11px] text-slate-400 text-center -mt-1">
          PDF, Word, PowerPoint, text files, or a photo of your notes · up to 20 MB
        </p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Course (optional)"
            className={inputClass}
          />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
            {KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {formError && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-[11px]">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <button
          onClick={upload}
          disabled={uploading || !fileName}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold active:scale-[0.98] transition disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload size={15} /> Add to my library
            </>
          )}
        </button>
      </div>

      {loading ? (
        <CenteredState loading message="Loading your materials…" />
      ) : materials.length === 0 ? (
        <CenteredState
          icon={FolderOpen}
          title="No materials yet"
          message="Upload a course outline or lecture slides and the AI will build flashcards and practice questions from what is actually in the document."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              busy={busyId === material.id}
              error={errors[material.id]}
              onGenerate={() => generate(material)}
              onStudy={() => navigate(`/study/flashcards?set=${material.set_id}`)}
              onRemove={() => remove(material)}
            />
          ))}
        </div>
      )}
    </div>
  );
}