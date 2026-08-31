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
      { source: '/home', destination: '/home.html' },
      { source: '/home/', destination: '/home.html' },
      { source: '/families', destination: '/families.html' },
      { source: '/families/', destination: '/families.html' },
      { source: '/one-day', destination: '/one-day.html' },
      { source: '/one-day/', destination: '/one-day.html' },
      { source: '/running', destination: '/running.html' },
      { source: '/running/', destination: '/running.html' },
    ]
  },
}
module.exports = nextConfig
