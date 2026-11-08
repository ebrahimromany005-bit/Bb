
export async function onRequest() {
  const urls = [
    "https://globalscholarguide.online/",
    "https://globalscholarguide.online/opportunities",
    "https://globalscholarguide.online/countries",
    "https://globalscholarguide.online/blog",
    "https://globalscholarguide.online/applications",
    "https://globalscholarguide.online/learn",
    "https://globalscholarguide.online/about",
    "https://globalscholarguide.online/profile"
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
