/** @type {import('next').NextConfig} */
const nextConfig = {
  // כתובות קצרות וזכירות לשיתוף באינסטגרם — /menu במקום /menu.html
  async rewrites() {
    return [
      { source: '/menu', destination: '/menu.html' },
      { source: '/celiac', destination: '/celiac.html' },
      { source: '/lunchbox', destination: '/lunchbox.html' },
      { source: '/lunchbox/', destination: '/lunchbox.html' },
      { source: '/fat-guide', destination: '/fat-guide.html' },
      { source: '/fat-guide/', destination: '/fat-guide.html' },
    ]
  },
}
module.exports = nextConfig
