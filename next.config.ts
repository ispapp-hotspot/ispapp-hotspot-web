import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    turbopack: {
        root: __dirname,
    },
    // React Compiler — stable no Next.js 16
    reactCompiler: true,

    // Cache Components — habilita "use cache" directive e Partial Prerendering
    cacheComponents: true,

    // Headers de segurança
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
        ];
    },

    images: {
        remotePatterns: [
            { protocol: "https", hostname: "portal.ispapp.com.br" },
            { protocol: "https", hostname: "cdn.ispapp.com.br" },
        ],
    },
};

export default nextConfig;
