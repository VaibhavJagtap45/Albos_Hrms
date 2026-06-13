/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML/JS export -> produces an `out/` folder that can be served by any
  // static web server (CyberPanel / OpenLiteSpeed / Apache) with no Node process.
  output: "export",
  poweredByHeader: false,

  // Static hosting serves /route/ -> /route/index.html, so emit folder-style pages.
  trailingSlash: true,

  // next/image optimization needs a server; disable it for a static export.
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
