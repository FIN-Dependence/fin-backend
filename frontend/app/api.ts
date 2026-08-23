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
  insurance: string;
  debtPayment: string;
  cardPayment: string;
  emergencyFund: string;
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
  "insurance" | "debtPayment" | "cardPayment" | "emergencyFund" | "familySupport" | "moveDate"
> & {
  age: number | null;
  monthlyIncome: number | null;
  deposit: number | null;
  monthlyRent: number | null;
  maintenance: number | null;
  insurance: number | null;
  debtPayment: number | null;
  cardPayment: number | null;
  emergencyFund: number | null;
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
const CLIENT_KEY = "findependence-client-id-v1";

export function getClientId() {
  let id = window.localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = `web_${crypto.randomUUID().replaceAll("-", "")}`;
    window.localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

export async function loadRemoteProfile(clientId: string): Promise<{ profile: FinancialProfile; savedAt: string } | null> {
  const response = await fetch(`${API_BASE}/api/profiles/${clientId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("금융환경을 불러오지 못했습니다.");
  const data = await response.json() as ProfileResponse;
  return { profile: fromApi(data), savedAt: formatSavedAt(data.updatedAt) };
}

export async function saveRemoteProfile(clientId: string, profile: FinancialProfile) {
  const response = await fetch(`${API_BASE}/api/profiles/${clientId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApi(profile)),
  });
  if (!response.ok) throw new Error(await errorMessage(response, "금융환경을 저장하지 못했습니다."));
  const data = await response.json() as ProfileResponse;
  return { profile: fromApi(data), savedAt: formatSavedAt(data.updatedAt) };
}

export async function sendChat(clientId: string, message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, message }),
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
    insurance: amount(profile.insurance),
    debtPayment: amount(profile.debtPayment),
    cardPayment: amount(profile.cardPayment),
    emergencyFund: amount(profile.emergencyFund),
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
    insurance: text(data.insurance),
    debtPayment: text(data.debtPayment),
    cardPayment: text(data.cardPayment),
    emergencyFund: text(data.emergencyFund),
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
