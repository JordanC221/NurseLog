import { useState, useRef } from "react";
import { useClinicalData } from "@/hooks/useClinicalData";
import { useSettings } from "@/hooks/useSettings";
import { computeStats, formatHours, getEffectiveRotations } from "@/lib/clinical";
import { jsPDF } from "jspdf";
import { Download, Eye, Lock, Unlock } from "lucide-react";

export default function Reports() {
  const { skillLogs, sessions } = useClinicalData();
  const { settings } = useSettings();
  const rotations = getEffectiveRotations(settings);
  const previewRef = useRef(null);

  const [filter, setFilter] = useState("all"); // all | signed | rotation | semester
  const [rotation, setRotation] = useState(settings?.default_rotation || "med-surg");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [previewing, setPreviewing] = useState(false);

  function getFilteredSkills() {
    let list = [...skillLogs];
    if (filter === "signed") list = list.filter((s) => s.is_signed);
    if (filter === "rotation") list = list.filter((s) => s.rotation_type === rotation);
    if (dateFrom) list = list.filter((s) => s.date >= dateFrom);
    if (dateTo) list = list.filter((s) => s.date <= dateTo);
    if (settings?.semester && filter === "semester")
      list = list.filter((s) => s.semester === settings.semester);
    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  function getFilteredSessions() {
    let list = [...sessions];
    if (filter === "rotation") list = list.filter((s) => s.rotation_type === rotation);
    if (dateFrom) list = list.filter((s) => s.start_time?.slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((s) => s.start_time?.slice(0, 10) <= dateTo);
    if (settings?.semester && filter === "semester")
      list = list.filter((s) => s.semester === settings.semester);
    return list;
  }

  function buildPdf() {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    const student = settings?.student_name || "Student";
    const school = settings?.school_name || "";
    const semester = settings?.semester || "";
    const skills = getFilteredSkills();
    const sess = getFilteredSessions();
    const stats = computeStats(skills, sess, settings);

    function header() {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Clinical Hours & Skills Report", margin, y);
      y += 18;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Student: ${student}`, margin, y);
      if (school) doc.text(`School: ${school}`, margin + 220, y);
      y += 14;
      doc.text(`Semester: ${semester}`, margin, y);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        margin + 220,
        y
      );
      y += 6;
      doc.setDrawColor(200);
      doc.line(margin, y, pageW - margin, y);
      y += 18;
    }

    function footer(pageNum) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${student} - ${semester} - Page ${pageNum}`,
        pageW / 2,
        pageH - 20,
        { align: "center" }
      );
      doc.setTextColor(0);
    }

    let pageNum = 1;
    header();

    // Summary section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Progress Summary", margin, y);
    y += 16;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Hours Logged: ${formatHours(stats.totalHours)}`, margin, y);
    y += 13;
    doc.text(`Hours Required: ${stats.requiredHours}h`, margin, y);
    y += 13;
    doc.text(`Hours Remaining: ${formatHours(stats.hoursRemaining)}`, margin, y);
    y += 13;
    doc.text(`Completed Skills: ${stats.completedSkills} / ${stats.requiredSkills}`, margin, y);
    y += 13;
    doc.text(`Unsigned Entries: ${stats.unsignedCount}`, margin, y);
    y += 20;

    // Hours by rotation
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Hours by Rotation", margin, y);
    y += 16;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    Object.entries(stats.hoursByRotation).forEach(([r, h]) => {
      if (y > pageH - margin) {
        footer(pageNum);
        doc.addPage();
        pageNum++;
        y = margin;
      }
      doc.text(`${r}: ${formatHours(h)}`, margin, y);
      y += 13;
    });
    y += 12;

    // Skill logs
    if (y > pageH - 100) {
      footer(pageNum);
      doc.addPage();
      pageNum++;
      y = margin;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Skill Logs", margin, y);
    y += 18;

    skills.forEach((s) => {
      if (y > pageH - 140) {
        footer(pageNum);
        doc.addPage();
        pageNum++;
        y = margin;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${s.skill_name}  -  ${s.date}`, margin, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.text(
        `Category: ${s.skill_category || "-"}   Attempt: ${s.attempt_number}   Success: ${
          s.successful ? "Yes" : "No"
        }`,
        margin,
        y
      );
      y += 13;
      doc.text(`Rotation: ${s.rotation_type || "-"}`, margin, y);
      if (s.patient_id) doc.text(`Patient ID: ${s.patient_id}`, margin + 200, y);
      y += 13;
      if (s.preceptor_name) {
        doc.text(`Preceptor: ${s.preceptor_name}`, margin, y);
        y += 13;
      }
      if (s.notes) {
        const split = doc.splitTextToSize(`Notes: ${s.notes}`, pageW - margin * 2 - 120);
        doc.text(split, margin, y);
        y += split.length * 12;
      }
      // signature
      doc.setFont("helvetica", "bold");
      if (s.is_signed && s.signature_data) {
        try {
          doc.addImage(s.signature_data, "PNG", pageW - margin - 110, y - 20, 100, 40);
        } catch (e) {
          // ignore image errors
        }
        doc.text(`Signed by: ${s.signer_name}`, pageW - margin - 110, y + 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(
          `${s.signed_at ? new Date(s.signed_at).toLocaleString() : ""}`,
          pageW - margin - 110,
          y + 42
        );
        doc.setFontSize(10);
      } else {
        doc.setTextColor(180, 80, 80);
        doc.text("UNSIGNED", pageW - margin - 110, y + 10);
        doc.setTextColor(0);
      }
      doc.setFont("helvetica", "normal");
      y += 55;
      doc.setDrawColor(230);
      doc.line(margin, y, pageW - margin, y);
      y += 14;
    });

    footer(pageNum);
    return doc;
  }

  function downloadPdf() {
    const doc = buildPdf();
    doc.save(`Clinical_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function previewPdf() {
    const doc = buildPdf();
    const url = doc.output("bloburl");
    window.open(url, "_blank");
  }

  const filteredSkills = getFilteredSkills();
  const filteredSessions = getFilteredSessions();
  const stats = computeStats(filteredSkills, filteredSessions, settings);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Generate PDF Report</h1>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Export Filter</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All entries</option>
            <option value="signed">Signed entries only</option>
            <option value="rotation">By rotation</option>
            <option value="semester">By semester</option>
          </select>
        </div>

        {filter === "rotation" && (
          <select
            value={rotation}
            onChange={(e) => setRotation(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none capitalize"
          >
            {rotations.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <p className="text-xs text-slate-500 font-semibold mb-1">Report Preview</p>
        <p className="text-sm text-slate-700">
          {filteredSkills.length} skill entries · {formatHours(stats.totalHours)} hours
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {settings?.student_name} · {settings?.semester}
        </p>
      </div>

      <button
        onClick={previewPdf}
        className="flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-800 text-white font-bold active:scale-95 transition"
      >
        <Eye size={20} /> Preview Report
      </button>
      <button
        onClick={downloadPdf}
        className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 text-white font-bold active:scale-95 transition"
      >
        <Download size={20} /> Download PDF
      </button>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Included Entries</h2>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {filteredSkills.slice(0, 30).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">{s.skill_name}</p>
                <p className="text-xs text-slate-400">
                  {s.date} · {s.rotation_type}
                </p>
              </div>
              {s.is_signed ? (
                <Lock size={16} className="text-emerald-500" />
              ) : (
                <Unlock size={16} className="text-amber-500" />
              )}
            </div>
          ))}
          {filteredSkills.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No entries match.</p>
          )}
        </div>
      </div>
    </div>
  );
}