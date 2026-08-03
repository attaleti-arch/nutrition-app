/** @type {import('next').NextConfig} */
const nextConfig = {
  // כתובות קצרות וזכירות לשיתוף באינסטגרם — /menu במקום /menu.html
  async rewrites() {
    return [
      { source: '/menu', destination: '/menu.html' },
    ]
  },
}
module.exports = nextConfig
