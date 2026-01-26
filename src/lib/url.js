export function toDirectImageUrl(input) {
  if (!input) return "";
  const url = String(input).trim();
  if (!url) return "";

  // Already a data URL or blob (allow)
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // If missing protocol, try https
  const u = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;

  // Google Drive: /file/d/<id>/view
  const m1 = u.match(/drive\.google\.com\/file\/d\/([^/]+)\//);
  if (m1?.[1]) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;

  // Google Drive: open?id=<id>
  const m2 = u.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (m2?.[1]) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;

  // Google Drive: uc?id=<id> (already close)
  const m3 = u.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/);
  if (m3?.[1]) return `https://drive.google.com/uc?export=view&id=${m3[1]}`;

  // Dropbox: convert ?dl=0 to raw
  if (u.includes("dropbox.com")) {
    return u.replace("www.dropbox.com", "dl.dropboxusercontent.com")
            .replace("?dl=0", "");
  }

  return u;
}
