import { env } from './env';

// Server-side counterpart to apps/web/src/data/bunnyUpload.ts, which takes a
// browser File and is wired into MDXEditor's client-side image upload
// handler. This one takes a raw Buffer so scripts/import-docusaurus-course.ts
// can upload SVGs read off disk without a DOM File/fetch context.
export async function uploadBufferToBunny(buffer: Buffer, filename: string, pathPrefix: string, contentType: string): Promise<string> {
  const { storageZone: zone, storageAccessKey: accessKey, storageHostname: hostname, pullZoneUrl: pullZoneUrl } = env.bunny;
  if (!zone || !accessKey || !hostname || !pullZoneUrl) {
    throw new Error('Bunny.net is not configured. Check BUNNY_* environment variables in apps/api/.env.');
  }

  const path = `${pathPrefix}/${filename}`;
  const response = await fetch(`https://${hostname}/${zone}/${path}`, {
    method: 'PUT',
    headers: { AccessKey: accessKey, 'Content-Type': contentType },
    body: buffer,
  });
  if (!response.ok) {
    throw new Error(`Bunny upload failed (${response.status}) for ${path}`);
  }
  // pullZoneUrl may or may not have a trailing slash depending on how it was
  // copied into .env — normalize so the returned URL never has a double
  // slash regardless.
  return `${pullZoneUrl.replace(/\/+$/, '')}/${path}`;
}
