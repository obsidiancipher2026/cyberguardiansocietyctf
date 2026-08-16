import type { AxiosInstance } from "axios";

/**
 * Download a file through an axios client so authentication headers (Bearer
 * token / vault slug) are attached — a plain <a href download> would hit the
 * protected attachment endpoints without them and get a 401.
 */
export async function downloadFromApi(
  client: AxiosInstance,
  url: string,
  fallbackName: string
): Promise<void> {
  const res = await client.get(url, { responseType: "blob", timeout: 60000 });
  const data = res.data as unknown;
  if (!(data instanceof Blob)) {
    throw new Error("Unexpected download response");
  }
  const disposition = (res.headers?.["content-disposition"] as string | undefined) ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const name = match ? decodeURIComponent(match[1].replace(/^"|"$/g, "")) : fallbackName;
  const objectUrl = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}
