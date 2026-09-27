export async function uploadAsset(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/assets", {
    method: "POST",
    body: form,
  });
  const body = (await response.json()) as {
    data: { url: string } | null;
    error: string | null;
  };

  if (!response.ok || !body.data?.url) {
    throw new Error(body.error ?? "Upload failed");
  }

  return body.data.url;
}
