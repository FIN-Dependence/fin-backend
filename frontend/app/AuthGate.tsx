"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, AuthUser, authenticate, currentUser, logout } from "./api";
import { FinDependenceApp } from "./FinDependenceApp";

function broadcastSession() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("findependence-auth");
    channel.postMessage("changed");
    channel.close();
  }
}

export function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    async function check() {
      const request = ++sequence;
      try {
        const account = await currentUser();
        if (active && request === sequence) { setUser(account); setNotice(""); }
      } catch (error) {
        if (!active || request !== sequence) return;
        if (error instanceof ApiError && error.status === 401) setUser(null);
        else setNotice(error instanceof Error ? error.message : "서버 연결을 확인해 주세요.");
      } finally { if (active && request === sequence) setChecking(false); }
    }
    const expire = () => { sequence++; setUser(null); setChecking(false); setNotice("로그인이 만료되었습니다. 다시 로그인해 주세요."); };
    const visibility = () => { if (document.visibilityState === "visible") void check(); };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("findependence-auth") : null;
    if (channel) channel.onmessage = () => { setUser(null); setChecking(true); void check(); };
    window.addEventListener("findependence:session-expired", expire);
    document.addEventListener("visibilitychange", visibility);
    const interval = window.setInterval(() => void check(), 60000);
    void check();
    return () => {
      active = false;
      channel?.close(); window.clearInterval(interval);
      window.removeEventListener("findependence:session-expired", expire);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [retry]);

  async function signOut() {
    await logout(); // Only claim logout after the server revoked the session.
    setUser(null); setNotice("로그아웃되었습니다."); broadcastSession();
  }

  if (user) return <FinDependenceApp key={user.id} user={user} onLogout={signOut} />;
  return <LoginPanel checking={checking} notice={notice} onRetry={() => { setChecking(true); setRetry(v => v + 1); }}
    onSuccess={account => { setUser(account); setNotice(""); setChecking(false); setRetry(v => v + 1); broadcastSession(); }} />;
}

function LoginPanel({ checking, notice, onRetry, onSuccess }: {
  checking: boolean; notice: string; onRetry: () => void; onSuccess: (user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (checking || busy) return;
    const next: Record<string, string> = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) next.email = "이메일을 입력해 주세요.";
    if (mode === "register") {
      const [local = "", domain = "", ...rest] = normalizedEmail.split("@");
      const localValid = /^[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}$/.test(local) && !local.includes("..");
      const domainValid = /^(?=.{3,189}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/.test(domain);
      if (!localValid || !domainValid || rest.length > 0 || normalizedEmail.length > 254)
        next.email = "올바르지 않은 이메일 형식입니다. 예: name@example.com";
    }
    if (!password) next.password = "비밀번호를 입력해 주세요.";
    if (mode === "register") {
      if (displayName.trim().length < 2 || displayName.trim().length > 40) next.displayName = "이름 또는 별명은 2~40자로 입력해 주세요.";
      if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_-])[A-Za-z\d!@#$%^&*_-]{8,17}$/.test(password))
        next.password = "8~17자이며 대문자·숫자·특수문자(!@#$%^&*_-)를 각각 포함해 주세요.";
      if (password !== confirmPassword) next.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }
    setErrors(next); setFailure("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const user = await authenticate(mode, mode === "register"
        ? { email: normalizedEmail, password, displayName: displayName.trim(), confirmPassword }
        : { email: normalizedEmail, password });
      setPassword(""); setConfirmPassword(""); onSuccess(user);
    } catch (error) { setFailure(error instanceof Error ? error.message : "로그인에 실패했습니다."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-story" aria-label="서비스 소개">
      <div className="auth-brand"><span className="brand-mark">F</span><span>FINDEPENDENCE<small>첫 독립 금융 AI</small></span></div>
      <div className="auth-story-content">
        <span className="auth-kicker">YOUR FIRST FINANCIAL STEP</span>
        <h1>독립의 시작,<br />나에게 맞는<br /><em>금융 준비부터.</em></h1>
        <p>월세만으로는 보이지 않던 나의 금융환경.<br />한 번 정리하고, 달라진 상황도 이어서 상담하세요.</p>
        <div className="auth-steps"><span><b>01</b> 내 금융환경 입력</span><span><b>02</b> AI와 준비사항 확인</span><span><b>03</b> 언제든 수정하고 다시 상담</span></div>
      </div>
      <small className="auth-story-foot">소득 · 주거 · 보험 · 부채 · 결제 · 비상자금</small>
    </section>
    <section className="auth-form-side">
      <div className="auth-card">
        <span className="eyebrow">MY FINANCIAL SPACE</span>
        <h2>{mode === "login" ? "다시 만나 반가워요" : "나만의 금융 준비를 시작해요"}</h2>
        <p className="auth-subtitle">{mode === "login" ? "로그인하고 나의 설문과 상담을 이어가세요." : "계정을 만들면 금융환경을 저장하고 다시 꺼내볼 수 있어요."}</p>
        <div className="auth-tabs" aria-label="로그인 방식">
          {(["login", "register"] as const).map(value => <button key={value} type="button" disabled={busy} aria-pressed={mode === value}
            onClick={() => { setMode(value); setErrors({}); setFailure(""); setPassword(""); setConfirmPassword(""); setShowPassword(false); setShowConfirmPassword(false); }}>
            {value === "login" ? "로그인" : "회원가입"}</button>)}
        </div>
        {checking && <p className="auth-info" role="status">로그인 상태를 확인하고 있어요…</p>}
        {notice && !checking && <div className="auth-info" role="status">{notice} <button type="button" onClick={onRetry}>다시 확인</button></div>}
        <form onSubmit={submit} noValidate aria-busy={busy}>
          {mode === "register" && <label className="auth-field" htmlFor="auth-name">이름 또는 별명
            <input id="auth-name" autoComplete="nickname" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} placeholder="예: 홍길동" disabled={busy}
              aria-invalid={!!errors.displayName} aria-describedby={errors.displayName ? "name-error" : undefined} />
            {errors.displayName && <small id="name-error" className="field-error">{errors.displayName}</small>}
          </label>}
          <label className="auth-field" htmlFor="auth-email">이메일
            <input id="auth-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} maxLength={254}
              placeholder="name@example.com" disabled={busy} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
            {errors.email && <small id="email-error" className="field-error">{errors.email}</small>}
          </label>
          <label className="auth-field" htmlFor="auth-password">비밀번호
            <span className="password-field"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={e => setPassword(e.target.value)} maxLength={mode === "login" ? 64 : 17} placeholder={mode === "login" ? "비밀번호를 입력해 주세요" : "8~17자 · 대문자·숫자·특수문자"} disabled={busy}
              aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? "숨기기" : "보기"}</button></span>
            {errors.password && <small id="password-error" className="field-error">{errors.password}</small>}
          </label>
          {mode === "register" && <label className="auth-field" htmlFor="auth-confirm">비밀번호 확인
            <span className="password-field"><input id="auth-confirm" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} maxLength={17} placeholder="비밀번호를 한 번 더 입력해 주세요" disabled={busy}
              aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? "confirm-error" : undefined} />
              <button type="button" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}>{showConfirmPassword ? "숨기기" : "보기"}</button></span>
            {errors.confirmPassword && <small id="confirm-error" className="field-error">{errors.confirmPassword}</small>}
          </label>}
          {failure && <p className="auth-error" role="alert">{failure}</p>}
          <button className="auth-submit" disabled={checking || busy}>{busy ? "확인 중…" : mode === "login" ? "로그인하고 시작하기 →" : "가입하고 금융환경 입력하기 →"}</button>
        </form>
        <p className="auth-security">내 계정으로 저장한 금융환경만 불러옵니다.<br />공용 기기에서는 이용 후 꼭 로그아웃해 주세요.</p>
      </div>
      <small className="auth-foot">FINDEPENDENCE · 나의 첫 금융자립</small>
    </section>
  </main>;
}
