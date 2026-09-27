import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // standalone is for Docker; Vercel uses its own output
  output: process.env.VERCEL ? undefined : "standalone",
};

export default withNextIntl(nextConfig);
