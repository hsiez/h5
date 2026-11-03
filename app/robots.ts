import type { MetadataRoute } from 'next';
export default function robots():MetadataRoute.Robots {
  return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/api/admin/','/things/claim/','/things/preview/']},sitemap:'https://h5.codes/sitemap.xml'};
}
