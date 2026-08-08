import axios from "axios";
const API_BASE = "http://localhost:3000";


export type ActionType = "Send" | "Caution" | "Wait";
export type LevelType = "Low" | "Moderate" | "High";

export interface ProgramStatus {
  name: string;
  level: LevelType;
}

export interface StatusResponse {
  network: string;
  programs: ProgramStatus[];
  data_freshness_ms: number;
  updated_at: string;
}

export interface ProgramResponse {
  program: string;
  level: LevelType;
  data_freshness_ms: number;
}

export interface AccountContention {
  address: string;
  tx_per_1s: number;
  tx_per_5s: number;
  tx_per_30s: number;
  level: LevelType;
}

export interface SimulationResult {
  success: boolean;
  error: string | null;
  compute_units_used: number;
  blockhash_slots_remaining: number;
  logs: string[];
}

export interface DataFreshness {
  last_update_ms: number;
  is_stale: boolean;
}

export interface Recommendation {
  action: ActionType;
  recommended_priority_fee: number;
  reasons: string[];
  contention: AccountContention[];
  simulation: SimulationResult;
  data_freshness: DataFreshness;
  analyzed_at_slot: number;
}


export async function fetchStatus(): Promise<StatusResponse> {
  const res = await axios.get<StatusResponse>(`${API_BASE}/v1/status`);
  return res.data;
}

export async function fetchProgram(name: string): Promise<ProgramResponse> {
  const res = await axios.get<ProgramResponse>(`${API_BASE}/v1/program/${name}`);
  return res.data;
}

export async function analyzeTransaction(transaction: string): Promise<Recommendation> {
  const res = await axios.post<Recommendation>(`${API_BASE}/v1/analyze`, { transaction });
  return res.data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    await axios.get(`${API_BASE}/health`);
    return true;
  } catch {
    return false;
  }
}
