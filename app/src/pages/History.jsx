import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Trash2,
  Unlock,
  XCircle,
} from "lucide-react";
import { nurselog } from "@/api/client";
import { usePagedRecords } from "@/hooks/usePagedRecords";
import { useSettings } from "@/hooks/useSettings";
import { formatDuration, getEffectiveRotations } from "@/lib/clinical";

const selectClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function History() {
  const { settings } = useSettings();
  const rotations = getEffectiveRotations(settings);

  const [tab, setTab] = useState("skills");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterRotation, setFilterRotation] = useState("all");
  const [filterSigned, setFilterSigned] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const skillFilter = useMemo(() => {
    const filter = {};
    if (debouncedQuery) {
      filter.skill_name = { $regex: escapeRegex(debouncedQuery), $options: "i" };
    }
    if (filterRotation !== "all") filter.rotation_type = filterRotation;
    if (filterSigned === "signed") filter.is_signed = true;
    if (filterSigned === "unsigned") filter.is_signed = false;
    return filter;
  }, [debouncedQuery, filterRotation, filterSigned]);

  const hoursFilter = useMemo(() => {
    const filter = { is_active: false };
    if (filterRotation !== "all") filter.rotation_type = filterRotation;
    return filter;
  }, [filterRotation]);

  const skills = usePagedRecords(nurselog.entities.SkillLog, {
    filter: skillFilter,
    sort: sortOrder === "newest" ? "-date" : "date",
  });

  const hours = usePagedRecords(nurselog.entities.HoursSession, {
    filter: hoursFilter,
    sort: sortOrder === "newest" ? "-start_time" : "start_time",
  });

  const active = tab === "skills" ? skills : hours;

  async function duplicate(skill) {
    const {
      id,
      created_date,
      updated_date,
      created_by_id,
      signature_data,
      signer_name,
      signed_at,
      is_signed,
      ...rest
    } = skill;
    await nurselog.entities.SkillLog.create({
      ...rest,
      is_signed: false,
      signature_data: "",
      signer_name: "",
      signed_at: null,
    });
    await skills.reload();
  }

  async function removeSkill(id) {
    await nurselog.entities.SkillLog.delete(id);
    await skills.reload();
  }

  async function removeSession(id) {
    await nurselog.entities.HoursSession.delete(id);
    await hours.reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Log History</h1>
          <p className="text-xs text-slate-500">
            Every logged entry, searched on the server so nothing is cut off.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-64">
          {[
            { key: "skills", label: "Skills" },
            { key: "hours", label: "Hours" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              aria-pressed={tab === item.key}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                tab === item.key ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tab === "skills" && (
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills…"
              aria-label="Search skills"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}
        <select
          value={filterRotation}
          onChange={(e) => setFilterRotation(e.target.value)}
          aria-label="Filter by rotation"
          className={`${selectClass} capitalize`}
        >
          <option value="all">All rotations</option>
          {rotations.map((rotation) => (
            <option key={rotation} value={rotation} className="capitalize">
              {rotation}
            </option>
          ))}
        </select>
        {tab === "skills" && (
          <select
            value={filterSigned}
            onChange={(e) => setFilterSigned(e.target.value)}
            aria-label="Filter by signature status"
            className={selectClass}
          >
            <option value="all">All entries</option>
            <option value="signed">Signed only</option>
            <option value="unsigned">Unsigned only</option>
          </select>
        )}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          aria-label="Sort order"
          className={selectClass}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {active.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold">These records could not be loaded.</p>
            <p className="mt-0.5">{active.error}</p>
          </div>
          <button
            onClick={() => active.reload()}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-semibold text-rose-700"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {active.loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading records…
        </div>
      ) : tab === "skills" ? (
        skills.items.length === 0 && !skills.error ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No skill entries match these filters.
          </p>
        ) : (
          <>
            {/* Wide screens: table */}
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Skill</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Rotation</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Outcome</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Signature</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.items.map((skill) => (
                    <tr key={skill.id} className="border-b border-slate-100 last:border-0">
                      <td className="max-w-[22rem] px-4 py-3">
                        <p className="truncate font-medium text-slate-800">{skill.skill_name}</p>
                        {skill.notes && (
                          <p className="truncate text-[11px] text-slate-400">{skill.notes}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{skill.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-500">
                        {skill.rotation_type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            skill.successful ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {skill.successful ? (
                            <CheckCircle2 size={13} aria-hidden="true" />
                          ) : (
                            <XCircle size={13} aria-hidden="true" />
                          )}
                          {skill.successful ? "Successful" : "Unsuccessful"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          {skill.is_signed ? (
                            <>
                              <Lock size={13} className="text-emerald-600" aria-hidden="true" />
                              {skill.signer_name || "Signed"}
                            </>
                          ) : (
                            <>
                              <Unlock size={13} className="text-amber-600" aria-hidden="true" />
                              Unsigned
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {!skill.is_signed && (
                            <>
                              <button
                                onClick={() => duplicate(skill)}
                                aria-label={`Duplicate ${skill.skill_name}`}
                                title="Duplicate"
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                              >
                                <Copy size={15} aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => removeSkill(skill.id)}
                                aria-label={`Delete ${skill.skill_name}`}
                                title="Delete"
                                className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phones / tablets: cards */}
            <div className="flex flex-col gap-2 md:hidden">
              {skills.items.map((skill) => (
                <div
                  key={skill.id}
                  className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {skill.skill_name}
                        </p>
                        {skill.is_signed ? (
                          <Lock size={14} className="shrink-0 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Unlock size={14} className="shrink-0 text-amber-600" aria-hidden="true" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {skill.date} · <span className="capitalize">{skill.rotation_type}</span> ·
                        Attempt {skill.attempt_number}
                      </p>
                      <p
                        className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
                          skill.successful ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {skill.successful ? (
                          <CheckCircle2 size={12} aria-hidden="true" />
                        ) : (
                          <XCircle size={12} aria-hidden="true" />
                        )}
                        {skill.successful ? "Successful" : "Unsuccessful"}
                      </p>
                      {skill.notes && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{skill.notes}</p>
                      )}
                      {skill.is_signed && (
                        <p className="mt-1.5 text-[11px] text-emerald-600">
                          Signed by {skill.signer_name} · {skill.signed_at?.slice(0, 10)}
                        </p>
                      )}
                    </div>
                  </div>
                  {!skill.is_signed && (
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => duplicate(skill)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-xs font-medium text-slate-600"
                      >
                        <Copy size={14} aria-hidden="true" /> Duplicate
                      </button>
                      <button
                        onClick={() => removeSkill(skill.id)}
                        aria-label={`Delete ${skill.skill_name}`}
                        className="rounded-lg bg-rose-50 px-3 py-2 text-rose-600"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )
      ) : hours.items.length === 0 && !hours.error ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No completed hours sessions match these filters.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {hours.items.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold capitalize text-slate-800">
                  {session.rotation_type}
                </p>
                <p className="text-xs text-slate-400">{session.start_time?.slice(0, 10)}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDuration(session.duration_minutes || 0)}
                </p>
              </div>
              <button
                onClick={() => removeSession(session.id)}
                aria-label={`Delete ${session.rotation_type} session`}
                className="rounded-lg bg-rose-50 p-2 text-rose-600"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!active.loading && (
        <div className="flex flex-col items-center gap-2 pb-2">
          <p className="text-[11px] text-slate-400">
            Showing {active.items.length} record{active.items.length === 1 ? "" : "s"}
            {active.hasMore ? " · more available" : ""}
          </p>
          {active.hasMore && (
            <button
              onClick={() => active.loadMore()}
              disabled={active.loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60"
            >
              {active.loadingMore && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}