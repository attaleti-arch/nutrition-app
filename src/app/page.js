import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import ClientHome from './ClientHome'

export default function Home() {
  const host = headers().get('host') || ''
  if (host === 'eti-attal.com' || host === 'www.eti-attal.com') {
    redirect('/landing.html')
  }
  return <ClientHome />
}
