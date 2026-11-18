import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Shield, Trash2 } from "lucide-react";
import { nurselog } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";

export default function Mfa() {
  const navigate = useNavigate();
  const { user, checkUserAuth } = useAuth();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startSetup() {
    setBusy(true);
    setError("");
    try {
      setSetup(await nurselog.auth.mfaSetup());
    } catch (err) {
      setError(err.message || "Could not start MFA setup.");
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    setBusy(true);
    setError("");
    try {
      await nurselog.auth.mfaEnable(code);
      setSetup(null);
      setCode("");
      await checkUserAuth();
    } catch (err) {
      setError(err.message || "Could not enable MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!confirm("Disable two-factor authentication?")) return;
    setBusy(true);
    setError("");
    try {
      await nurselog.auth.mfaDisable();
      setCode("");
      await checkUserAuth();
    } catch (err) {
      setError(err.message || "Could not disable MFA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/settings")} className="p-2 rounded-lg bg-slate-100">
          <Shield size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Two-factor authentication</h1>
          <p className="text-xs text-slate-500">Use an authenticator app for sign-in codes.</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {user?.mfa_enabled ? (
          <>
            <p className="text-sm text-emerald-700 font-semibold">Authenticator app enabled</p>
            <button
              onClick={disable}
              disabled={busy}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-700 font-semibold disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Disable two-factor authentication
            </button>
          </>
        ) : setup ? (
          <>
            <p className="text-sm text-slate-600">
              Add this secret to your authenticator app:
            </p>
            <code className="break-all rounded-lg bg-slate-100 p-3 text-sm">{setup.secret}</code>
            <p className="text-xs text-slate-500 break-all">OTP URI: {setup.otpauth_uri}</p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="w-full px-4 py-3 rounded-xl border border-slate-300"
            />
            <button
              onClick={enable}
              disabled={busy || code.length !== 6}
              className="py-3 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50"
            >
              {busy ? "Verifying..." : "Verify and enable"}
            </button>
          </>
        ) : (
          <button
            onClick={startSetup}
            disabled={busy}
            className="py-3 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50"
          >
            {busy ? "Preparing..." : "Set up authenticator app"}
          </button>
        )}
      </div>
    </div>
  );
}
