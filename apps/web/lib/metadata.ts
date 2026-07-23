import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ascendly.io";

interface MetaOptions {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
}

export function makeMetadata({
  title = "Ascendly — One Membership, 2,000+ Online Courses",
  description = "Learn business, tech, design, and data skills with one membership. 2,000+ expert-led courses. Start your free preview today.",
  path = "/",
  image = `${SITE_URL}/og-image.png`,
}: MetaOptions = {}): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Ascendly",
      images: [{ url: image, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export { SITE_URL };
