// api/customize.ts
import { API } from "./client";

export async function getMyCustomize(): Promise<Record<string, number>> {
  const { data } = await API.get("/me/customize", { withCredentials: true });
  return data;
}

export async function updateMyCustomize(patch: Record<string, number>) {
  const { data } = await API.put("/me/customize", patch, { withCredentials: true });
  return data;
}
