"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((data) => { setIsSetup(!data.hasUsers); setCheckingSetup(false); })
      .catch(() => setCheckingSetup(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let redirect = "/";
      if (isSetup) {
        const res = await fetch("/api/auth/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Setup failed"); setLoading(false); return; }
        const email = data.email;
        const cred = await signInWithEmailAndPassword(clientAuth, email, password);
        const idToken = await cred.user.getIdToken();
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const loginData = await loginRes.json().catch(() => ({}));
        if (loginData.redirect) redirect = loginData.redirect;
      } else {
        const email = username.includes("@") ? username : `${username}@portxhub.local`;
        const cred = await signInWithEmailAndPassword(clientAuth, email, password);
        const idToken = await cred.user.getIdToken();
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!res.ok) { setError("Login failed"); setLoading(false); return; }
        const loginData = await res.json().catch(() => ({}));
        if (loginData.redirect) redirect = loginData.redirect;
      }
      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("wrong-password") || msg.includes("user-not-found") || msg.includes("invalid-credential")) {
        setError("Invalid username or password");
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    setResetSending(true);
    try {
      const email = resetEmail.includes("@") ? resetEmail : `${resetEmail}@portxhub.local`;
      await sendPasswordResetEmail(clientAuth, email);
      setResetSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("user-not-found")) {
        setResetError("No account found with this email");
      } else {
        setResetError(msg);
      }
    }
    setResetSending(false);
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Image src="/portx-logo.png" alt="Portx" width={120} height={39} priority />
            <span className="font-semibold text-sm text-violet-600 bg-violet-50 px-2 py-0.5 rounded">Hub</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isSetup ? "Create your admin account" : "Sign in to your account"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
          {isSetup && (
            <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 mb-5 text-sm text-violet-700">
              First time setup — create your admin credentials.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400"
                placeholder="Enter your username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400"
                  placeholder={isSetup ? "Min 6 characters" : "Enter your password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 text-white py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Please wait..." : isSetup ? "Create Account" : "Sign In"}
            </button>
          </form>

          {!isSetup && (
            <div className="mt-4 text-center">
              <button onClick={() => { setShowReset(true); setResetSent(false); setResetError(""); setResetEmail(""); }}
                className="text-sm text-violet-600 hover:text-violet-800 hover:underline">
                Forgot password?
              </button>
            </div>
          )}
        </div>

        {/* Password Reset Modal */}
        {showReset && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              {resetSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Reset Email Sent</h3>
                  <p className="text-sm text-gray-500 mb-4">Check your inbox for the password reset link.</p>
                  <button onClick={() => setShowReset(false)}
                    className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                    Back to Login
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Reset Password</h3>
                  <p className="text-sm text-gray-500 mb-4">Enter your email to receive a reset link.</p>
                  {resetError && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-red-600">{resetError}</div>
                  )}
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <input
                      type="text"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Username or email"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={resetSending}
                        className="flex-1 bg-violet-600 text-white py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2">
                        {resetSending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {resetSending ? "Sending..." : "Send Reset Link"}
                      </button>
                      <button type="button" onClick={() => setShowReset(false)}
                        className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
