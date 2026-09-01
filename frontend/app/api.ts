export type FinancialProfile = {
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

export type ApiAdvice = {
  status: "확인 필요" | "주의" | "양호";
  title: string;
  description: string;
  action: string;
};

type ProfileResponse = Omit<FinancialProfile,
  "age" | "monthlyIncome" | "deposit" | "monthlyRent" | "maintenance" |
  "monthlyUtilities" | "monthlyFood" | "monthlyTransport" | "monthlyCommunication" |
  "insurance" | "debtPayment" | "cardPayment" | "otherFixedCost" | "emergencyFund" |
  "movingCost" | "furnishingCost" | "familySupport" | "moveDate"
> & {
  age: number | null;
  monthlyIncome: number | null;
  deposit: number | null;
  monthlyRent: number | null;
  maintenance: number | null;
  monthlyUtilities: number | null;
  monthlyFood: number | null;
  monthlyTransport: number | null;
  monthlyCommunication: number | null;
  insurance: number | null;
  debtPayment: number | null;
  cardPayment: number | null;
  otherFixedCost: number | null;
  emergencyFund: number | null;
  movingCost: number | null;
  furnishingCost: number | null;
  familySupport: number | null;
  moveDate: string | null;
  updatedAt: string;
};

type ChatResponse = {
  answer: string;
  advice: ApiAdvice[];
  sources: string[];
  createdAt: string;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
export type AuthUser = { id: string; email: string; displayName: string; role: "USER" | "ADMIN" };
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// JWT stays in an HttpOnly cookie. Neither JWTs nor financial profiles are stored in localStorage.
let csrf: { token: string; headerName: string } | null = null;
let csrfLoading: Promise<void> | null = null;
async function ensureCsrf() {
  if (csrf) return;
  if (!csrfLoading) csrfLoading = (async () => {
    const response = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new ApiError(response.status, "요청 보안 확인에 실패했습니다. 다시 시도해 주세요.");
    csrf = await response.json();
  })().finally(() => { csrfLoading = null; });
  await csrfLoading;
}

async function apiFetch(path: string, init: RequestInit = {}, allow404 = false): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.method && !["GET", "HEAD"].includes(init.method)) {
    await ensureCsrf();
    headers.set(csrf!.headerName, csrf!.token);
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없습니다. 백엔드 실행 상태를 확인해 주세요.");
  }
  if (response.status === 403) csrf = null;
  if (!response.ok && !(allow404 && response.status === 404)) {
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      window.dispatchEvent(new Event("findependence:session-expired"));
    }
    throw new ApiError(response.status, await errorMessage(response, "요청을 처리하지 못했습니다."));
  }
  return response;
}

export async function currentUser(): Promise<AuthUser> {
  return (await apiFetch("/api/auth/me")).json();
}
export async function authenticate(mode: "login" | "register", body: Record<string, string>): Promise<AuthUser> {
  const response = await apiFetch(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
  csrf = null; // Authentication rotates the CSRF cookie.
  return response.json();
}
export async function logout() {
  try { await apiFetch("/api/auth/logout", { method: "POST" }); }
  catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
  csrf = null;
}
export type HistoryMessage = { role: "user" | "assistant"; text: string; createdAt: string };
export async function loadHistory(): Promise<HistoryMessage[]> {
  return (await apiFetch("/api/chat/history")).json();
}

export async function loadRemoteProfile(): Promise<{ profile: FinancialProfile; savedAt: string } | null> {
  const response = await apiFetch("/api/profiles/me", {}, true);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("금융환경을 불러오지 못했습니다.");
  const data = await response.json() as ProfileResponse;
  return { profile: fromApi(data), savedAt: formatSavedAt(data.updatedAt) };
}

export async function saveRemoteProfile(profile: FinancialProfile) {
  const response = await apiFetch("/api/profiles/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApi(profile)),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "금융환경을 저장하지 못했습니다."));
  const data = await response.json() as ProfileResponse;
  return { profile: fromApi(data), savedAt: formatSavedAt(data.updatedAt) };
}

export async function sendChat(message: string): Promise<ChatResponse> {
  const response = await apiFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "AI 상담에 연결하지 못했습니다."));
  return response.json();
}

function toApi(profile: FinancialProfile) {
  const amount = (value: string) => value.trim() === "" ? null : Number(value);
  return {
    ...profile,
    age: profile.age ? Number(profile.age) : null,
    monthlyIncome: amount(profile.monthlyIncome),
    deposit: amount(profile.deposit),
    monthlyRent: amount(profile.monthlyRent),
    maintenance: amount(profile.maintenance),
    monthlyUtilities: amount(profile.monthlyUtilities),
    monthlyFood: amount(profile.monthlyFood),
    monthlyTransport: amount(profile.monthlyTransport),
    monthlyCommunication: amount(profile.monthlyCommunication),
    insurance: amount(profile.insurance),
    debtPayment: amount(profile.debtPayment),
    cardPayment: amount(profile.cardPayment),
    otherFixedCost: amount(profile.otherFixedCost),
    emergencyFund: amount(profile.emergencyFund),
    movingCost: amount(profile.movingCost),
    furnishingCost: amount(profile.furnishingCost),
    familySupport: amount(profile.familySupport),
    moveDate: profile.moveDate || null,
  };
}

function fromApi(data: ProfileResponse): FinancialProfile {
  const text = (value: number | null) => value == null ? "" : String(value);
  return {
    name: data.name || "",
    age: data.age == null ? "" : String(data.age),
    employment: data.employment,
    monthlyIncome: text(data.monthlyIncome),
    housingType: data.housingType,
    deposit: text(data.deposit),
    monthlyRent: text(data.monthlyRent),
    maintenance: text(data.maintenance),
    utilities: data.utilities || "확인하지 못함",
    monthlyUtilities: text(data.monthlyUtilities),
    monthlyFood: text(data.monthlyFood),
    monthlyTransport: text(data.monthlyTransport),
    monthlyCommunication: text(data.monthlyCommunication),
    insurance: text(data.insurance),
    debtPayment: text(data.debtPayment),
    cardPayment: text(data.cardPayment),
    otherFixedCost: text(data.otherFixedCost),
    emergencyFund: text(data.emergencyFund),
    movingCost: text(data.movingCost),
    furnishingCost: text(data.furnishingCost),
    familySupport: text(data.familySupport),
    familySupportEnds: data.familySupportEnds,
    moveDate: data.moveDate || "",
  };
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json() as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
