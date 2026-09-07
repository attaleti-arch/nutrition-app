/** @type {import('next').NextConfig} */
const nextConfig = {
  // חותמת גרסה למסך של וילדן: בבדיקות שטח היא ראתה "עדיין אותו דבר" כי
  // הטלפון הריץ את הבנייה הקודמת. עם שבע תווים על המסך שנינו יודעים
  // איזו גרסה רצה. Vercel מזריק את ה-SHA בזמן הבנייה.
  env: {
    NEXT_PUBLIC_BUILD: (process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7),
  },
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
