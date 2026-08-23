"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getClientId, loadRemoteProfile, saveRemoteProfile, sendChat } from "./api";

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
  insurance: string;
  debtPayment: string;
  cardPayment: string;
  emergencyFund: string;
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

const STORAGE_KEY = "findependence-profile-v1";

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
  insurance: "",
  debtPayment: "",
  cardPayment: "",
  emergencyFund: "",
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

const money = (value: string) => Number(value.replace(/[^0-9]/g, "")) || 0;
const formatWon = (value: number) => `${Math.max(0, Math.round(value / 10000)).toLocaleString("ko-KR")}만원`;

function getSummary(profile: Profile) {
  const income = money(profile.monthlyIncome) + (profile.familySupportEnds ? 0 : money(profile.familySupport));
  const housing = money(profile.monthlyRent) + money(profile.maintenance);
  const required = housing + money(profile.insurance) + money(profile.debtPayment) + money(profile.cardPayment);
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

function buildReply(profile: Profile, question: string) {
  const { income, housing, required, balance, emergencyMonths } = getSummary(profile);
  const person = profile.name ? `${profile.name}님의 저장된 금융환경` : "저장된 금융환경";

  if (/가능|괜찮|살 수|독립/.test(question)) {
    return `${person}을 기준으로 보면 확인된 월 유입은 ${formatWon(income)}, 확인된 필수지출은 ${formatWon(required)}이고 남는 금액은 약 ${formatWon(balance)}이에요. 다만 식비·교통비·통신비와 별도 공과금이 아직 포함되지 않았을 수 있으므로, 이 금액을 최종 여유자금으로 보기는 어려워요.`;
  }
  if (/비상|저축|여유/.test(question)) {
    return `현재 비상자금은 확인된 필수지출의 약 ${emergencyMonths.toFixed(1)}개월분이에요. 독립 첫 달에는 이사비와 생활용품 같은 일회성 비용도 발생하므로, 그 비용을 제외한 비상자금을 따로 확인하는 것이 좋아요.`;
  }
  if (/주거|월세|관리비|공과금/.test(question)) {
    return `현재 확인된 월 주거비는 월세와 관리비를 합쳐 ${formatWon(housing)}이에요. 관리비에 수도·난방이 포함되는지, 전기·가스·인터넷은 별도인지 확인하면 실제 월 주거비를 더 정확하게 계산할 수 있어요.`;
  }
  if (/뭐|무엇|확인|준비|빠진/.test(question)) {
    return `${person}에서 우선 확인할 것은 관리비 포함 항목, 독립 후 직접 납부할 보험료, 그리고 이사 초기비용이에요. 확인되지 않은 금액은 0원으로 단정하지 않고 추가 질문으로 남겨둘게요.`;
  }
  return `${person}을 반영해 답변할게요. 현재 계산된 월 필수지출은 ${formatWon(required)}입니다. 질문과 관련된 금액이 설문에 없다면 임의로 추정하지 않고, 필요한 정보를 먼저 확인하겠습니다.`;
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

export function FinDependenceApp() {
  const [view, setView] = useState<"chat" | "survey">("chat");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [draft, setDraft] = useState<Profile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [clientId, setClientId] = useState("");
  const [waiting, setWaiting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getClientId();
    setClientId(id);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw) as { profile: Profile; savedAt: string };
        const loaded = { ...emptyProfile, ...data.profile };
        setProfile(loaded);
        setDraft(loaded);
        setSaved(true);
        setSavedAt(data.savedAt || "이전에 저장됨");
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    loadRemoteProfile(id).then((remote) => {
      if (!remote) return;
      const loaded = { ...emptyProfile, ...remote.profile };
      setProfile(loaded);
      setDraft(loaded);
      setSaved(true);
      setSavedAt(remote.savedAt);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: loaded, savedAt: remote.savedAt }));
    }).catch(() => undefined);
  }, []);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const summary = useMemo(() => getSummary(profile), [profile]);
  const completion = useMemo(() => {
    const keys: (keyof Profile)[] = ["age", "employment", "monthlyIncome", "housingType", "monthlyRent", "maintenance", "utilities", "insurance", "debtPayment", "emergencyFund"];
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
    if (waiting) return;
    setWaiting(true);
    const now = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: draft, savedAt: now }));
    let stored = draft;
    let storedAt = now;
    let serverConnected = false;
    try {
      const remote = await saveRemoteProfile(clientId || getClientId(), draft);
      stored = { ...emptyProfile, ...remote.profile };
      storedAt = remote.savedAt;
      serverConnected = true;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: stored, savedAt: storedAt }));
    } catch {
      // 로컬 미리보기와 백엔드 일시 중단 상황에서도 입력은 잃지 않는다.
    }
    setProfile(stored);
    setSaved(true);
    setSavedAt(storedAt);
    setView("chat");
    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: "assistant",
        text: `${stored.name || "사용자"}님의 금융환경을 ${serverConnected ? "서버에" : "이 기기에"} 저장했어요. 상황이 바뀌면 언제든 수정할 수 있어요. 먼저 확인할 항목을 정리했습니다.`,
        advice: buildAdvice(stored),
      },
    ]);
    setWaiting(false);
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || waiting) return;
    setMessages((current) => [...current, { id: Date.now(), role: "user", text: question }]);
    setInput("");
    setWaiting(true);
    let reply = saved ? buildReply(profile, question) : "정확한 답변을 위해 먼저 금융환경 설문을 저장해 주세요. 모르는 항목은 비워두어도 괜찮아요.";
    let advice = saved ? buildAdvice(profile) : undefined;
    if (saved) {
      try {
        const response = await sendChat(clientId || getClientId(), question);
        reply = response.answer;
        advice = response.advice;
      } catch {
        // 서버 연결 실패 시 화면의 계산 결과로 안전하게 답변한다.
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

        <div className="profile-mini">
          <div className="avatar">{profile.name?.[0] || "나"}</div>
          <div><strong>{profile.name || "나의 금융환경"}</strong><small>{saved ? `${completion}% 입력 · ${savedAt}` : "설문을 작성해 주세요"}</small></div>
          <button onClick={openSurvey} aria-label="금융환경 수정">•••</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="mobile-brand">FINDEPENDENCE</span>
            <h1>{view === "chat" ? "나의 독립 준비 상담" : saved ? "금융환경 업데이트" : "첫 독립 금융환경 설문"}</h1>
          </div>
          <div className={`status-pill ${saved ? "ready" : ""}`}><span /> {saved ? "내 정보 연결됨" : "설문 대기 중"}</div>
        </header>

        {view === "chat" ? (
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
                  <div className="saved-note">마지막 저장 <strong>{savedAt}</strong><span>이 정보는 이 기기에 안전하게 저장됩니다.</span></div>
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
                  <label>이름 또는 별명<input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="예: 지윤" /></label>
                  <label>나이<input type="number" value={draft.age} onChange={(e) => update("age", e.target.value)} placeholder="예: 26" required /></label>
                  <label>취업 상태<select value={draft.employment} onChange={(e) => update("employment", e.target.value)}><option>첫 취업 · 정규직</option><option>계약직</option><option>프리랜서</option><option>구직 중</option><option>대학생 · 대학원생</option></select></label>
                  <label>월 실수령 소득<span className="money-input"><input type="number" value={draft.monthlyIncome} onChange={(e) => update("monthlyIncome", e.target.value)} placeholder="2450000" required /><em>원</em></span></label>
                  <label>독립 예정일<input type="date" value={draft.moveDate} onChange={(e) => update("moveDate", e.target.value)} /></label>
                  <label>월 가족 지원금<span className="money-input"><input type="number" value={draft.familySupport} onChange={(e) => update("familySupport", e.target.value)} placeholder="없으면 0" /><em>원</em></span></label>
                </div>
                <label className="check-line"><input type="checkbox" checked={draft.familySupportEnds} onChange={(e) => update("familySupportEnds", e.target.checked)} /><span>현재 가족 지원은 독립과 함께 종료돼요</span></label>
              </section>

              <section className="form-section">
                <div className="section-title"><span>02</span><div><h3>예정된 주거비</h3><p>계약 조건과 매달 직접 부담할 비용을 입력해요.</p></div></div>
                <div className="field-grid three">
                  <label>주거 형태<select value={draft.housingType} onChange={(e) => update("housingType", e.target.value)}><option>월세</option><option>전세</option><option>공공임대</option><option>기숙사</option><option>아직 미정</option></select></label>
                  <label>보증금<span className="money-input"><input type="number" value={draft.deposit} onChange={(e) => update("deposit", e.target.value)} placeholder="10000000" /><em>원</em></span></label>
                  <label>월세<span className="money-input"><input type="number" value={draft.monthlyRent} onChange={(e) => update("monthlyRent", e.target.value)} placeholder="650000" /><em>원</em></span></label>
                  <label>월 관리비<span className="money-input"><input type="number" value={draft.maintenance} onChange={(e) => update("maintenance", e.target.value)} placeholder="80000" /><em>원</em></span></label>
                  <label>관리비 포함 항목<select value={draft.utilities} onChange={(e) => update("utilities", e.target.value)}><option>확인하지 못함</option><option>일부만 확인</option><option>확인 완료</option></select></label>
                </div>
              </section>

              <section className="form-section">
                <div className="section-title"><span>03</span><div><h3>매달 나가는 금융비용</h3><p>독립 후에도 계속 부담할 결제와 부채를 확인해요.</p></div></div>
                <div className="field-grid three">
                  <label>월 보험료<span className="money-input"><input type="number" value={draft.insurance} onChange={(e) => update("insurance", e.target.value)} placeholder="모르면 비워두기" /><em>원</em></span></label>
                  <label>월 대출 상환액<span className="money-input"><input type="number" value={draft.debtPayment} onChange={(e) => update("debtPayment", e.target.value)} placeholder="학자금 포함" /><em>원</em></span></label>
                  <label>월 카드 결제 예정액<span className="money-input"><input type="number" value={draft.cardPayment} onChange={(e) => update("cardPayment", e.target.value)} placeholder="최근 평균" /><em>원</em></span></label>
                  <label>현재 비상자금<span className="money-input"><input type="number" value={draft.emergencyFund} onChange={(e) => update("emergencyFund", e.target.value)} placeholder="700000" /><em>원</em></span></label>
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
      </section>
    </main>
  );
}
