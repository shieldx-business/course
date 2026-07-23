import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ascendly.io";

async function fetchDynamic() {
  try {
    const api = process.env.API_BASE_URL || "http://localhost:8000";
    const [categories, courses] = await Promise.all([
      fetch(`${api}/api/v1/categories`, { next: { revalidate: 60 } }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/api/v1/courses`, { next: { revalidate: 60 } }).then((r) => (r.ok ? r.json() : [])),
    ]);
    return { categories, courses };
  } catch {
    return { categories: [], courses: [] };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, courses } = await fetchDynamic();

  const staticRoutes = [
    "/",
    "/about",
    "/courses",
    "/pricing",
    "/membership",
    "/reviews",
    "/blog",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "/" ? 1.0 : 0.7,
  }));

  for (const cat of categories) {
    entries.push({
      url: `${BASE_URL}/courses/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const course of courses) {
    entries.push({
      url: `${BASE_URL}/courses/${course.category_slug}/${course.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
