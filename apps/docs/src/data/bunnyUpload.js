function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, '-')
    .replace(/-+/g, '-');
}

// customFields comes from useDocusaurusContext().siteConfig.customFields —
// see bunnyStorageZone/bunnyStorageAccessKey/bunnyStorageHostname/bunnyPullZoneUrl
// in docusaurus.config.js, same pattern as web3formsAccessKey.
export async function uploadToBunny(file, pathPrefix, customFields) {
  const {
    bunnyStorageZone: zone,
    bunnyStorageAccessKey: accessKey,
    bunnyStorageHostname: hostname,
    bunnyPullZoneUrl: pullZoneUrl,
  } = customFields ?? {};

  if (!zone || !accessKey || !pullZoneUrl) {
    throw new Error('Bunny.net is not configured. Check BUNNY_* environment variables.');
  }

  const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
  const path = `${pathPrefix}/${filename}`;

  const response = await fetch(`https://${hostname}/${zone}/${path}`, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Bunny.net upload failed: ${response.status} ${response.statusText}`);
  }

  return `${pullZoneUrl.replace(/\/$/, '')}/${path}`;
}
