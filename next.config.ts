import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    turbopack: {
        root: __dirname,
    },
    // React Compiler — stable no Next.js 16
    reactCompiler: true,

    // Cache Components — substitui PPR no Next.js 16
    // Habilita "use cache" directive e Partial Prerendering
    cacheComponents: true,

    // Proxy para o hotspot-api
    async rewrites() {
        return [
            {
                source: "/api/v1/:path*",
                destination: `${process.env.HOTSPOT_API_URL ?? 'http://localhost:8080'}/api/v1/:path*`,
            },
        ];
    },

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
        ],
    },
};

export default nextConfig;
