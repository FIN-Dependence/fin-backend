export type FinancialProfile = {
  title: string;
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
  status: "확인 필요" | "점검 권장" | "주의" | "양호";
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
  clientId: string;
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

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
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
  const method = (init.method || "GET").toUpperCase();
  const requiresCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
  let response: Response | null = null;

  // A different tab or an embedded browser may rotate the CSRF cookie while this
  // page still holds the previous token. Refresh it and retry exactly once.
  for (let attempt = 0; attempt < (requiresCsrf ? 2 : 1); attempt += 1) {
    const headers = new Headers(init.headers);
    if (requiresCsrf) {
      await ensureCsrf();
      headers.set(csrf!.headerName, csrf!.token);
      headers.set("Content-Type", "application/json");
    }
    try {
      response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
    } catch {
      throw new ApiError(0, "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (response.status === 403 && requiresCsrf && attempt === 0) {
      csrf = null;
      continue;
    }
    break;
  }

  if (!response) throw new ApiError(0, "서버 응답을 확인할 수 없습니다.");
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
export type StoredEnvironment = { id: string; profile: FinancialProfile; savedAt: string };
export async function loadHistory(environmentId: string): Promise<HistoryMessage[]> {
  return (await apiFetch(`/api/chat/history?environmentId=${encodeURIComponent(environmentId)}`)).json();
}

export async function loadRemoteProfiles(): Promise<StoredEnvironment[]> {
  const response = await apiFetch("/api/profiles");
  const data = await response.json() as ProfileResponse[];
  return data.map(toStoredEnvironment);
}

export async function saveRemoteProfile(environmentId: string | null, profile: FinancialProfile) {
  const response = await apiFetch(environmentId ? `/api/profiles/${encodeURIComponent(environmentId)}` : "/api/profiles", {
    method: environmentId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApi(profile)),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "금융환경을 저장하지 못했습니다."));
  const data = await response.json() as ProfileResponse;
  return toStoredEnvironment(data);
}

export async function deleteRemoteProfile(environmentId: string) {
  await apiFetch(`/api/profiles/${encodeURIComponent(environmentId)}`, { method: "DELETE" });
}

export async function sendChat(environmentId: string, message: string): Promise<ChatResponse> {
  const response = await apiFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ environmentId, message }),
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
    title: data.title || "나의 독립 환경",
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

function toStoredEnvironment(data: ProfileResponse): StoredEnvironment {
  return { id: data.clientId, profile: fromApi(data), savedAt: formatSavedAt(data.updatedAt) };
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
