const BASE = "https://provinces.open-api.vn/api/v2";
export type Ward = { code: number; name: string; province_code: number };
export type Province = { code: number; name: string; wards?: Ward[] };

async function read(path: string): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Không tải được địa chỉ.");
  return response.json();
}
export async function getProvinces(): Promise<Province[]> {
  const data = await read("/p/");
  if (!Array.isArray(data) || !data.length || !data.every(p => Number.isInteger(p.code) && typeof p.name === "string")) throw new Error("Dữ liệu tỉnh thành không hợp lệ.");
  return data.map(p => ({ code: p.code, name: p.name }));
}
export async function getProvince(code: number): Promise<Province> {
  const data = await read(`/p/${code}?depth=2`) as Province;
  if (data.code !== code || typeof data.name !== "string" || !Array.isArray(data.wards) || !data.wards.every(w => Number.isInteger(w.code) && typeof w.name === "string" && w.province_code === code)) throw new Error("Dữ liệu phường xã không hợp lệ.");
  return data;
}
export async function resolveAddress(provinceCode: number, wardCode: number) {
  const province = await getProvince(provinceCode);
  const ward = province.wards?.find(item => item.code === wardCode);
  if (!ward) return null;
  return { province: province.name, ward: ward.name, provinceCode, wardCode };
}
