import { useMemo, useState } from "react";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { ArrowLeft, CalendarDays, Download, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { nurselog } from "@/api/client";
import { useSchedule } from "@/hooks/useSchedule";
import { useSettings } from "@/hooks/useSettings";
import {
  dayLabel,
  downloadScheduleIcs,
  expandOccurrences,
  googleCalendarUrl,
  groupByDate,
  timeRange,
  typeMeta,
} from "@/lib/schedule";
import SessionForm from "@/components/schedule/SessionForm";
import SessionItem from "@/components/schedule/SessionItem";
import CenteredState from "@/components/study/CenteredState";

export default function Schedule() {
  const { sessions, loading, reload } = useSchedule();
  const { settings } = useSettings();
  const [tab, setTab] = useState("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  const ranges = useMemo(() => {
    const today = startOfDay(new Date());
    return {
      upcoming: expandOccurrences(sessions, today, endOfDay(addDays(today, 180))),
      past: expandOccurrences(
        sessions,
        startOfDay(addDays(today, -180)),
        endOfDay(addDays(today, -1))
      ).reverse(),
    };
  }, [sessions]);

  const groups = groupByDate((tab === "upcoming" ? ranges.upcoming : ranges.past).slice(0, 80));

  async function save(payload) {
    setSaving(true);
    try {
      const body = {
        ...payload,
        repeat_until: payload.repeat_weekly ? payload.repeat_until || "" : "",
      };
      if (editing?.id) await nurselog.entities.ClassSession.update(editing.id, body);
      else await nurselog.entities.ClassSession.create(body);
      await reload();
      setFormOpen(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await nurselog.entities.ClassSession.delete(id);
    setDetail(null);
    await reload();
  }

  if (formOpen) {
    return (
      <SessionForm
        initial={editing}
        settings={settings}
        saving={saving}
        onSave={save}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    );
  }

  if (detail) {
    const meta = typeMeta(detail.session.session_type);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDetail(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(detail.session);
                setDetail(null);
                setFormOpen(true);
              }}
              className="p-2 rounded-lg bg-slate-100"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => remove(detail.session.id)}
              className="p-2 rounded-lg bg-rose-50 text-rose-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div>
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.chip} mb-2`}
          >
            {meta.label}
          </span>
          <h1 className="text-xl font-bold text-slate-900">{detail.session.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {dayLabel(detail.date)} · {timeRange(detail.session)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3">
          <DetailRow label="Date" value={detail.date} />
          {detail.session.location && <DetailRow label="Location" value={detail.session.location} />}
          {detail.session.instructor && (
            <DetailRow label="Instructor" value={detail.session.instructor} />
          )}
          {detail.session.session_type === "clinical" && detail.session.rotation_type && (
            <DetailRow label="Rotation" value={detail.session.rotation_type} />
          )}
          {detail.session.repeat_weekly && (
            <DetailRow
              label="Repeats"
              value={`Weekly until ${detail.session.repeat_until || "—"}`}
            />
          )}
          {detail.session.notes && <DetailRow label="Notes" value={detail.session.notes} />}
        </div>

        <a
          href={googleCalendarUrl(detail.session, detail.date)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-600 text-white font-semibold active:scale-[0.98] transition"
        >
          <ExternalLink size={16} /> Add to Google Calendar
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-600">
            <CalendarDays size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Schedule</h1>
            <p className="text-xs text-slate-500">Classes, clinicals & deadlines</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="p-2.5 rounded-xl bg-teal-600 text-white active:scale-95 transition"
        >
          <Plus size={18} />
        </button>
      </div>

      {ranges.upcoming.length > 0 && (
        <button
          onClick={() => downloadScheduleIcs(ranges.upcoming.slice(0, 300))}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 active:scale-[0.98] transition"
        >
          <Download size={15} /> Export to my calendar (.ics)
        </button>
      )}

      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
        {[
          { key: "upcoming", label: "Upcoming" },
          { key: "past", label: "Past" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`py-2 rounded-lg text-xs font-semibold transition ${
              tab === item.key ? "bg-white text-teal-600 shadow-sm" : "text-slate-500"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <CenteredState loading message="Loading your schedule…" />
      ) : groups.length === 0 ? (
        <CenteredState
          icon={CalendarDays}
          title={tab === "upcoming" ? "Nothing scheduled yet" : "No past sessions"}
          message="Add your class dates, clinical shifts, labs, and exam deadlines so they are all in one place."
          actionLabel={tab === "upcoming" ? "Add a session" : undefined}
          onAction={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.date} className="flex flex-col gap-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                {dayLabel(group.date)}
              </p>
              {group.items.map((item, index) => (
                <SessionItem
                  key={`${item.session.id}-${item.date}-${index}`}
                  session={item.session}
                  onClick={() => setDetail(item)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-700 text-right capitalize">{value}</span>
    </div>
  );
}