"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AuthUser, loadHistory, loadRemoteProfile, saveRemoteProfile, sendChat } from "./api";

type Profile = {
  name: string;
  age: string;
  employment: string;
  monthlyIncome: string;
  housingType: string;
  deposit: string;
  monthlyRent: string;
  maintenance: string;
  utilities: string;
  monthlyUtilities: string;
  monthlyFood: string;
  monthlyTransport: string;
  monthlyCommunication: string;
  insurance: string;
  debtPayment: string;
  cardPayment: string;
  otherFixedCost: string;
  emergencyFund: string;
  movingCost: string;
  furnishingCost: string;
  familySupport: string;
  familySupportEnds: boolean;
  moveDate: string;
};

type Advice = {
  status: "확인 필요" | "주의" | "양호";
  title: string;
  description: string;
  action: string;
};

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  advice?: Advice[];
};

const emptyProfile: Profile = {
  name: "",
  age: "",
  employment: "첫 취업 · 정규직",
  monthlyIncome: "",
  housingType: "월세",
  deposit: "",
  monthlyRent: "",
  maintenance: "",
  utilities: "확인하지 못함",
  monthlyUtilities: "",
  monthlyFood: "",
  monthlyTransport: "",
  monthlyCommunication: "",
  insurance: "",
  debtPayment: "",
  cardPayment: "",
  otherFixedCost: "",
  emergencyFund: "",
  movingCost: "",
  furnishingCost: "",
  familySupport: "",
  familySupportEnds: false,
  moveDate: "",
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    text: "안녕하세요. 첫 독립에 필요한 금융 준비를 함께 확인해 드릴게요. 먼저 금융환경 설문을 작성하면, 저장된 상황을 바탕으로 빠진 비용과 확인할 일을 구체적으로 알려드릴 수 있어요.",
  },
];

const money = (value: string) => Number(value) || 0;
const formatWon = (value: number) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;

function getSummary(profile: Profile) {
  const income = money(profile.monthlyIncome) + (profile.familySupportEnds ? 0 : money(profile.familySupport));
  const housing = money(profile.monthlyRent) + money(profile.maintenance) + money(profile.monthlyUtilities);
  const required = housing + money(profile.monthlyFood) + money(profile.monthlyTransport)
    + money(profile.monthlyCommunication) + money(profile.insurance) + money(profile.debtPayment)
    + money(profile.cardPayment) + money(profile.otherFixedCost);
  const balance = income - required;
  const emergencyMonths = required > 0 ? money(profile.emergencyFund) / required : 0;
  return { income, housing, required, balance, emergencyMonths };
}

function buildAdvice(profile: Profile): Advice[] {
  const { required, emergencyMonths } = getSummary(profile);
  const result: Advice[] = [];

  if (profile.utilities !== "확인 완료") {
    result.push({
      status: "확인 필요",
      title: "관리비에 포함된 공과금을 확인하세요",
      description: "수도·난방·전기·가스가 별도라면 실제 주거비가 지금 계산보다 커질 수 있어요.",
      action: "임대차 조건 또는 관리비 고지서에서 포함 항목 확인",
    });
  }
  if (!profile.monthlyFood || !profile.monthlyTransport || !profile.monthlyCommunication) {
    result.push({
      status: "확인 필요",
      title: "독립 후 기본 생활비를 채워 주세요",
      description: "식비·교통비·통신비는 월세 외에 매달 반복되는 비용이라 실제 잔액 계산에 필요해요.",
      action: "최근 지출을 참고해 생활비 항목 입력",
    });
  }
  if (!profile.insurance) {
    result.push({
      status: "확인 필요",
      title: "독립 후 직접 납부할 보험료가 빠져 있어요",
      description: "현재 보장과 실제 납부자를 확인해야 월 필수지출을 정확히 계산할 수 있어요.",
      action: "보험 앱에서 계약자·납부자·월 보험료 확인",
    });
  }
  if (required > 0 && emergencyMonths < 1) {
    result.push({
      status: "주의",
      title: "비상자금이 필수지출 1개월분보다 적어요",
      description: `현재 입력 기준 비상자금은 약 ${emergencyMonths.toFixed(1)}개월분이에요. 입주 직후 예상 밖 지출에 취약할 수 있어요.`,
      action: "이사 초기비용과 별도로 비상자금 목표액 설정",
    });
  }
  if (profile.familySupportEnds && money(profile.familySupport) > 0) {
    result.push({
      status: "주의",
      title: "독립과 함께 종료되는 가족 지원이 있어요",
      description: `월 ${formatWon(money(profile.familySupport))}을 제외한 본인 소득만으로 다시 계산해야 해요.`,
      action: "지원 종료 시점을 반영해 독립 후 예산 재계산",
    });
  }
  if (!result.length) {
    result.push({
      status: "양호",
      title: "핵심 금융정보가 입력되었어요",
      description: "현재 확인된 항목에서는 큰 누락이 보이지 않아요. 이사 초기 일회성 비용을 추가로 점검해 보세요.",
      action: "이사비·가구·중개보수 등 초기비용 입력",
    });
  }
  return result.slice(0, 3);
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function MoneyInput({ label, value, onChange, placeholder, required = false }: {
  label: string; value: string; onChange: (won: string) => void; placeholder: string; required?: boolean;
}) {
  const manwon = value === "" ? "" : String(Number(value) / 10000);
  return <label>{label}<span className="money-input">
    <input type="number" min={0} max={100000000} step={0.1} value={manwon}
      onChange={(event) => {
        if (event.target.value === "") return onChange("");
        const amount = Number(event.target.value);
        if (Number.isFinite(amount) && amount >= 0) onChange(String(Math.round(amount * 10000)));
      }} placeholder={placeholder} required={required} />
    <em>만원</em>
  </span></label>;
}

export function FinDependenceApp({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  const [view, setView] = useState<"chat" | "survey">("chat");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [draft, setDraft] = useState<Profile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [waiting, setWaiting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    // Anonymous browser data has no verified account owner; never import it automatically.
    Promise.all([loadRemoteProfile(), loadHistory()]).then(([remote, history]) => {
      if (!active) return;
      const loaded = remote ? { ...emptyProfile, ...remote.profile } : { ...emptyProfile, name: user.displayName };
      setProfile(loaded);
      setDraft(loaded);
      setSaved(!!remote);
      setSavedAt(remote?.savedAt || "");
      if (!remote) setView("survey");
      setMessages(history.length ? history.map((m, i) => ({ id: i + 1, role: m.role, text: m.text })) : initialMessages);
    }).catch((failure: unknown) => {
      if (active) { setLoadFailed(true); setError(failure instanceof Error ? failure.message : "정보를 불러오지 못했습니다."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id, user.displayName, retry]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const summary = useMemo(() => getSummary(profile), [profile]);
  const completion = useMemo(() => {
    const keys: (keyof Profile)[] = ["age", "employment", "monthlyIncome", "housingType", "monthlyRent", "maintenance", "utilities",
      "monthlyUtilities", "monthlyFood", "monthlyTransport", "monthlyCommunication", "insurance", "debtPayment", "emergencyFund"];
    return Math.round((keys.filter((key) => profile[key] !== "").length / keys.length) * 100);
  }, [profile]);

  const update = (key: keyof Profile, value: string | boolean) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  function openSurvey() {
    setDraft(profile);
    setView("survey");
  }

  async function saveSurvey(event: FormEvent) {
    event.preventDefault();
    if (waiting || loading || loadFailed) return;
    const amounts = [draft.monthlyIncome, draft.deposit, draft.monthlyRent, draft.maintenance, draft.monthlyUtilities,
      draft.monthlyFood, draft.monthlyTransport, draft.monthlyCommunication, draft.insurance, draft.debtPayment,
      draft.cardPayment, draft.otherFixedCost, draft.emergencyFund, draft.movingCost, draft.furnishingCost, draft.familySupport];
    if (amounts.some(value => value !== "" && (!Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 1000000000000))) {
      setError("금액은 0원 이상 1조원 이하의 정수로 입력해 주세요. 모르는 금액은 비워두세요.");
      return;
    }
    setWaiting(true); setError("");
    try {
      const remote = await saveRemoteProfile(draft);
      const stored = { ...emptyProfile, ...remote.profile };
      setProfile(stored); setDraft(stored); setSaved(true); setSavedAt(remote.savedAt); setView("chat");
      setMessages(current => [...current, {
        id: Date.now(), role: "assistant",
        text: `${stored.name || user.displayName}님의 금융환경을 계정에 저장했어요. 상황이 바뀌면 언제든 수정할 수 있어요. 먼저 확인할 항목을 정리했습니다.`,
        advice: buildAdvice(stored),
      }]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "저장하지 못했습니다. 입력 내용을 확인해 주세요."); }
    finally { setWaiting(false); }
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || waiting || loading || loadFailed) return;
    setError("");
    setMessages((current) => [...current, { id: Date.now(), role: "user", text: question }]);
    setInput("");
    setWaiting(true);
    let reply = "정확한 답변을 위해 먼저 금융환경 설문을 저장해 주세요. 모르는 항목은 비워두어도 괜찮아요.";
    let advice: Advice[] | undefined;
    if (saved) {
      try {
        const response = await sendChat(question);
        reply = response.answer;
        advice = response.advice;
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "상담에 연결하지 못했습니다.");
        setInput(question); setWaiting(false); return;
      }
    }
    setMessages((current) => [...current, {
      id: Date.now() + 1,
      role: "assistant",
      text: reply,
      advice,
    }]);
    setWaiting(false);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("chat")} aria-label="FINDEPENDENCE 홈">
          <span className="brand-mark">F</span>
          <span><strong>FINDEPENDENCE</strong><small>첫 독립 금융 AI</small></span>
        </button>

        <button className="new-chat" onClick={() => { setMessages(initialMessages); setView("chat"); }}>
          <Icon>＋</Icon> 새 상담 시작
        </button>

        <nav className="nav-list" aria-label="주요 메뉴">
          <button className={view === "chat" ? "active" : ""} onClick={() => setView("chat")}><Icon>⌁</Icon> AI 상담</button>
          <button className={view === "survey" ? "active" : ""} onClick={openSurvey}><Icon>✓</Icon> {saved ? "금융환경 수정" : "금융환경 설문"}</button>
        </nav>

        <div className="sidebar-section">
          <p>추천 질문</p>
          <button onClick={() => { setInput("지금 소득으로 독립이 가능할까?"); setView("chat"); }}>독립 가능성 확인</button>
          <button onClick={() => { setInput("내가 빠뜨린 독립 비용은 뭐야?"); setView("chat"); }}>누락 비용 찾기</button>
          <button onClick={() => { setInput("비상자금은 얼마나 필요해?"); setView("chat"); }}>비상자금 점검</button>
        </div>

        <div className="profile-area" ref={profileMenuRef}>
        {profileMenuOpen && <div className="profile-menu" role="menu">
          <div><strong>{user.displayName}</strong><small>{user.email}</small></div>
          <button role="menuitem" onClick={() => { setProfileMenuOpen(false); openSurvey(); }}><span>⚙</span> 금융환경 설정</button>
          <button role="menuitem" className="logout-item" disabled={waiting} onClick={async () => {
            setWaiting(true); setProfileMenuOpen(false);
            try { await onLogout(); } catch (failure) { setError(failure instanceof Error ? failure.message : "로그아웃하지 못했습니다."); }
            finally { setWaiting(false); }
          }}><span>↪</span> 로그아웃</button>
        </div>}
        <button className="profile-mini" type="button" aria-haspopup="menu" aria-expanded={profileMenuOpen}
          onClick={() => setProfileMenuOpen(open => !open)}>
          <div className="avatar">{profile.name?.[0] || "나"}</div>
          <div><strong>{user.displayName}</strong><small title={user.email}>{user.email}</small></div>
          <span aria-hidden="true">•••</span>
        </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="mobile-brand">FINDEPENDENCE</span>
            <h1>{view === "chat" ? "나의 독립 준비 상담" : saved ? "금융환경 업데이트" : "첫 독립 금융환경 설문"}</h1>
          </div>
          <div className="account-actions"><div className={`status-pill ${saved ? "ready" : ""}`}><span /> {saved ? "내 정보 연결됨" : "설문 대기 중"}</div></div>
        </header>

        <div className="workspace-body">
        {error && <div className="app-error" role="alert">{error}{loadFailed && <button onClick={() => { setLoading(true); setLoadFailed(false); setError(""); setRetry(v => v + 1); }}>다시 불러오기</button>}</div>}
        {loading ? <div className="account-loading" role="status">내 계정의 금융환경을 불러오고 있어요…</div> : loadFailed ? <div className="account-loading">기존 정보를 덮어쓰지 않도록 입력을 잠시 멈췄어요. 다시 불러오기를 눌러 주세요.</div> : view === "chat" ? (
          <div className="chat-page">
            <section className="chat-column">
              <div className="chat-scroll">
                <div className="day-label">오늘</div>
                {!saved && (
                  <section className="onboarding-card">
                    <div className="onboarding-copy">
                      <span className="eyebrow">3분이면 충분해요</span>
                      <h2>월세 말고도<br />준비할 것이 많으니까.</h2>
                      <p>소득·주거비·보험·부채·결제·비상자금을 입력하면 AI가 지금 빠진 독립 준비를 찾아드려요.</p>
                      <button onClick={openSurvey}>금융환경 입력하기 <b>→</b></button>
                    </div>
                    <div className="orbit" aria-hidden="true">
                      <span className="orbit-center">AI</span>
                      <i>소득</i><i>주거</i><i>부채</i><i>보험</i>
                    </div>
                  </section>
                )}

                {messages.map((message) => (
                  <article key={message.id} className={`message ${message.role}`}>
                    {message.role === "assistant" && <div className="bot-avatar">F</div>}
                    <div className="message-body">
                      {message.role === "assistant" && <div className="sender">FINDEPENDENCE AI <span>방금</span></div>}
                      <div className="bubble">{message.text}</div>
                      {message.advice && (
                        <div className="advice-list">
                          {message.advice.map((item) => (
                            <div className="advice-card" key={item.title}>
                              <div className="advice-top"><span className="advice-status" data-status={item.status}>{item.status}</span><span>→</span></div>
                              <strong>{item.title}</strong>
                              <p>{item.description}</p>
                              <button onClick={openSurvey}>{item.action}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                <div ref={endRef} />
              </div>

              <form className="composer" onSubmit={submitMessage}>
                <div className="suggestions">
                  {["지금 독립 가능할까?", "빠진 비용이 뭐야?", "주거비를 확인해 줘"].map((text) => <button type="button" key={text} onClick={() => setInput(text)}>{text}</button>)}
                </div>
                <div className="input-wrap">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={saved ? "저장된 내 상황을 바탕으로 질문해 보세요" : "설문을 작성하거나 독립 준비를 질문해 보세요"}
                    rows={1}
                    maxLength={1500}
                    aria-label="상담 질문"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button className="send" aria-label="메시지 보내기" disabled={waiting}>{waiting ? "…" : "↑"}</button>
                </div>
                <small className="notice">AI 답변은 금융 의사결정을 돕는 참고자료이며, 확인되지 않은 정보는 단정하지 않습니다.</small>
              </form>
            </section>

            <aside className="context-panel">
              <div className="context-heading">
                <div><span>MY CONTEXT</span><h2>나의 금융환경</h2></div>
                <button onClick={openSurvey}>{saved ? "수정" : "입력"}</button>
              </div>
              {saved ? (
                <>
                  <div className="profile-score">
                    <div className="score-ring" style={{ "--score": `${completion * 3.6}deg` } as React.CSSProperties}><span>{completion}<small>%</small></span></div>
                    <div><strong>정보 준비도</strong><p>확인된 정보와 비어 있는 항목을 구분했어요.</p></div>
                  </div>
                  <div className="metric-grid">
                    <div><span>월 유입</span><strong>{formatWon(summary.income)}</strong></div>
                    <div><span>확인된 지출</span><strong>{formatWon(summary.required)}</strong></div>
                    <div><span>예상 잔액</span><strong>{formatWon(summary.balance)}</strong></div>
                    <div><span>비상자금</span><strong>{summary.emergencyMonths.toFixed(1)}개월</strong></div>
                  </div>
                  <div className="context-list">
                    <div><span className="dot good" />소득<strong>확인</strong></div>
                    <div><span className={`dot ${profile.utilities === "확인 완료" ? "good" : "warn"}`} />주거비<strong>{profile.utilities === "확인 완료" ? "확인" : "일부 누락"}</strong></div>
                    <div><span className={`dot ${profile.insurance ? "good" : "warn"}`} />보험<strong>{profile.insurance ? "확인" : "확인 필요"}</strong></div>
                    <div><span className={`dot ${profile.emergencyFund ? "good" : "warn"}`} />비상자금<strong>{profile.emergencyFund ? "입력됨" : "미입력"}</strong></div>
                  </div>
                  <div className="saved-note">마지막 저장 <strong>{savedAt}</strong><span>로그인한 계정에 저장된 금융환경입니다.</span></div>
                </>
              ) : (
                <div className="empty-context"><span>＋</span><h3>아직 연결된 정보가 없어요</h3><p>설문을 저장하면 상담할 때마다 다시 설명하지 않아도 돼요.</p><button onClick={openSurvey}>설문 시작하기</button></div>
              )}
            </aside>
          </div>
        ) : (
          <div className="survey-page">
            <div className="survey-heading">
              <div><span className="eyebrow">MY FINANCIAL PROFILE</span><h2>독립 후의 생활을 알려주세요.</h2><p>모르는 항목은 비워두세요. AI가 필요한 것만 추가로 질문합니다.</p></div>
              <div className="survey-progress"><strong>{saved ? completion : 0}%</strong><span>현재 입력도</span></div>
            </div>

            <form onSubmit={saveSurvey}>
              <section className="form-section">
                <div className="section-title"><span>01</span><div><h3>나의 현재 상황</h3><p>독립 시점의 소득과 생활 상태를 확인해요.</p></div></div>
                <div className="field-grid three">
                  <label>이름 또는 별명<input maxLength={40} value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="예: 홍길동" /></label>
                  <label>나이 (19~39세)<input type="number" min={19} max={39} step={1} value={draft.age} onChange={(e) => update("age", e.target.value)} placeholder="예: 26" required /></label>
                  <label>취업 상태<select value={draft.employment} onChange={(e) => update("employment", e.target.value)}><option>첫 취업 · 정규직</option><option>계약직</option><option>프리랜서</option><option>구직 중</option><option>대학생 · 대학원생</option></select></label>
                  <MoneyInput label="월 실수령 소득" value={draft.monthlyIncome} onChange={(value) => update("monthlyIncome", value)} placeholder="예: 245" required />
                  <label>독립 예정일<input type="date" value={draft.moveDate} onChange={(e) => update("moveDate", e.target.value)} /></label>
                  <MoneyInput label="월 가족 지원금" value={draft.familySupport} onChange={(value) => update("familySupport", value)} placeholder="없으면 0" />
                </div>
                <label className="check-line"><input type="checkbox" checked={draft.familySupportEnds} onChange={(e) => update("familySupportEnds", e.target.checked)} /><span>현재 가족 지원은 독립과 함께 종료돼요</span></label>
              </section>

              <section className="form-section">
                <div className="section-title"><span>02</span><div><h3>예정된 주거비</h3><p>계약 조건과 매달 직접 부담할 비용을 입력해요.</p></div></div>
                <div className="field-grid three">
                  <label>주거 형태<select value={draft.housingType} onChange={(e) => update("housingType", e.target.value)}><option>월세</option><option>전세</option><option>공공임대</option><option>기숙사</option><option>아직 미정</option></select></label>
                  <MoneyInput label="보증금" value={draft.deposit} onChange={(value) => update("deposit", value)} placeholder="예: 1,000" />
                  <MoneyInput label="월세" value={draft.monthlyRent} onChange={(value) => update("monthlyRent", value)} placeholder="예: 65" />
                  <MoneyInput label="월 관리비" value={draft.maintenance} onChange={(value) => update("maintenance", value)} placeholder="예: 8" />
                  <label>관리비 포함 항목<select value={draft.utilities} onChange={(e) => update("utilities", e.target.value)}><option>확인하지 못함</option><option>일부만 확인</option><option>확인 완료</option></select></label>
                  <MoneyInput label="관리비 외 월 공과금" value={draft.monthlyUtilities} onChange={(value) => update("monthlyUtilities", value)} placeholder="전기·가스·수도" />
                </div>
              </section>

              <section className="form-section">
                <div className="section-title"><span>03</span><div><h3>독립 후 기본 생활비</h3><p>공식 생활비 자료의 항목에 맞춰 매달 반복되는 비용을 확인해요.</p></div></div>
                <div className="field-grid three">
                  <MoneyInput label="월 식비" value={draft.monthlyFood} onChange={(value) => update("monthlyFood", value)} placeholder="장보기·외식" />
                  <MoneyInput label="월 교통비" value={draft.monthlyTransport} onChange={(value) => update("monthlyTransport", value)} placeholder="대중교통 등" />
                  <MoneyInput label="월 통신비" value={draft.monthlyCommunication} onChange={(value) => update("monthlyCommunication", value)} placeholder="휴대폰·인터넷" />
                  <MoneyInput label="월 보험료" value={draft.insurance} onChange={(value) => update("insurance", value)} placeholder="모르면 비워두기" />
                  <MoneyInput label="월 대출 상환액" value={draft.debtPayment} onChange={(value) => update("debtPayment", value)} placeholder="학자금 포함" />
                  <MoneyInput label="미분류 카드·자동이체" value={draft.cardPayment} onChange={(value) => update("cardPayment", value)} placeholder="위 항목 제외" />
                  <MoneyInput label="기타 월 고정비" value={draft.otherFixedCost} onChange={(value) => update("otherFixedCost", value)} placeholder="구독·회비 등" />
                </div>
                <p className="field-help">같은 지출을 생활비와 카드 결제액에 중복 입력하지 마세요. 카드 항목에는 위에서 분류하지 못한 금액만 적어 주세요.</p>
              </section>

              <section className="form-section">
                <div className="section-title"><span>04</span><div><h3>초기비용과 비상자금</h3><p>입주할 때 한 번 드는 돈과 생활을 지킬 자금을 분리해 확인해요.</p></div></div>
                <div className="field-grid three">
                  <MoneyInput label="예상 이사비" value={draft.movingCost} onChange={(value) => update("movingCost", value)} placeholder="운송·중개 등" />
                  <MoneyInput label="가구·가전 구입비" value={draft.furnishingCost} onChange={(value) => update("furnishingCost", value)} placeholder="입주 초기 구매" />
                  <MoneyInput label="현재 비상자금" value={draft.emergencyFund} onChange={(value) => update("emergencyFund", value)} placeholder="예: 70" />
                </div>
              </section>

              <div className="privacy-note"><span>✓</span><p><strong>확인되지 않은 값은 0원으로 처리하지 않아요.</strong><br />비어 있는 항목은 AI가 상담 중 필요한 순간에 다시 질문합니다.</p></div>

              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setView("chat")}>취소</button>
                <button type="submit" className="primary" disabled={waiting}>{waiting ? "저장 중…" : saved ? "변경사항 저장하고 다시 진단" : "저장하고 AI 상담 시작"}</button>
              </div>
            </form>
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
