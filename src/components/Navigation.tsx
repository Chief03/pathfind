'use client'

import { useState } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { signOut } from 'aws-amplify/auth'

export default function Navigation() {
  const { user } = useAuthenticator((context) => [context.user])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="text-2xl font-bold text-[#FF5A5F]">
              pathfind
            </a>
          </div>

          {/* Navigation Menu */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {user ? user.username?.[0]?.toUpperCase() : '?'}
                </div>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2">
                  {user ? (
                    <>
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        {user.username || user.signInDetails?.loginId}
                      </div>
                      <button
                        onClick={() => console.log('My Trips')}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        My Trips
                      </button>
                      <button
                        onClick={() => console.log('Profile')}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Profile
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => console.log('Sign In')}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => console.log('Sign Up')}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Create Account
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}