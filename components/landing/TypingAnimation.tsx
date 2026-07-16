'use client'

import { useEffect, useState, useRef } from 'react'

interface TypingAnimationProps {
  text: string
  speed?: number
  className?: string
  onComplete?: () => void
}

export default function TypingAnimation({ 
  text, 
  speed = 80, 
  className = '',
  onComplete 
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const hasCompleted = useRef(false)
  const onCompleteRef = useRef(onComplete)

  // Keep ref in sync without triggering effects
  onCompleteRef.current = onComplete

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('')
    setCurrentIndex(0)
    setIsTyping(true)
    hasCompleted.current = false
  }, [text])

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (!hasCompleted.current) {
      hasCompleted.current = true
      setIsTyping(false)
      onCompleteRef.current?.()
    }
  }, [currentIndex, text, speed])

  return (
    <span className={className}>
      {displayedText}
      {isTyping && (
        <span className="inline-block w-0.5 h-6 md:h-8 bg-accent ml-1 animate-pulse align-middle">
          |
        </span>
      )}
    </span>
  )
}
