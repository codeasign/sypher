// Uploads go through our own server route (`/api/upload`), which holds the
// Bunny storage key server-side, authenticates the caller, and validates
// type/size/path before PUTting to Bunny. The client never sees the key.

export async function uploadToBunny(file, pathPrefix) {
  const form = new FormData();
  form.append('file', file);
  form.append('prefix', pathPrefix);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Upload failed (${res.status})`);
  }

  const { url } = await res.json();
  return url;
}
