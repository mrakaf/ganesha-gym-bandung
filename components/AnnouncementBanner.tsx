'use client'

import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'

export default function AnnouncementBanner() {
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null)

  useEffect(() => {
    const loadLatestAnnouncement = async () => {
      try {
        const response = await fetch('/api/announcements')
        if (response.ok) {
          const data = await response.json()
          setLatestAnnouncement(data.announcement)
        }
      } catch (error) {
        console.error('Error loading announcement:', error)
      }
    }
    loadLatestAnnouncement()
  }, [])

  if (!latestAnnouncement) return null

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 py-4 px-6 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex items-start space-x-4">
        <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-oswald font-bold text-white mb-1">
            📢 {latestAnnouncement.title}
          </h3>
          <p className="text-white/90 font-poppins text-sm leading-relaxed whitespace-pre-wrap">
            {latestAnnouncement.content}
          </p>
        </div>
      </div>
    </div>
  )
}
