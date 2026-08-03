/** @type {import('next').NextConfig} */
const nextConfig = {
  // כתובות קצרות וזכירות לשיתוף באינסטגרם — /menu במקום /menu.html
  async rewrites() {
    return [
      { source: '/menu', destination: '/menu.html' },
      // גם האיות הזה עובד, כדי שקישור שכבר יצא החוצה לא ייפול על אות אחת
      { source: '/manu', destination: '/menu.html' },
    ]
  },
}
module.exports = nextConfig
