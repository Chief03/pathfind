import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ConfigureAmplifyClientSide from '@/components/ConfigureAmplify'
import AuthProvider from '@/components/AuthProvider'
import { ActivityTrackerProvider } from '@/contexts/ActivityTracker'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pathfind - Plan Group Trips Together',
  description: 'Collaborative trip planning made easy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigureAmplifyClientSide />
        <AuthProvider>
          <ActivityTrackerProvider>
            {children}
          </ActivityTrackerProvider>
        </AuthProvider>
      </body>
    </html>
  )
}