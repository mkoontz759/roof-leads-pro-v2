'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Hash, Copy, Check } from 'lucide-react'

interface AgentIdTooltipProps {
  memberId: string
}

export function AgentIdTooltip({ memberId }: AgentIdTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<'left' | 'center' | 'right'>('center')
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(memberId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(true)
    
    // Calculate position based on button's position in viewport
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const buttonCenterX = rect.left + rect.width / 2

      // Determine which third of the screen the button is in
      if (buttonCenterX < viewportWidth / 3) {
        setTooltipPosition('left')
      } else if (buttonCenterX > (viewportWidth * 2) / 3) {
        setTooltipPosition('right')
      } else {
        setTooltipPosition('center')
      }
    }
  }

  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false)
    if (isOpen) {
      window.addEventListener('click', handleClickOutside)
      return () => window.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative">
      <Button 
        ref={buttonRef}
        variant="ghost" 
        size="sm" 
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 h-6"
        onClick={handleClick}
      >
        <Hash className="h-3 w-3" />
        <span className="text-sm">click for Agent ID</span>
      </Button>

      {isOpen && (
        <div 
          className={`absolute bottom-full mb-2 p-3 bg-popover text-popover-foreground rounded-md shadow-lg border flex items-center gap-2 min-w-[300px] z-50 ${
            tooltipPosition === 'left' 
              ? 'left-0' 
              : tooltipPosition === 'right' 
                ? 'right-0' 
                : 'left-1/2 -translate-x-1/2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <code className="text-sm flex-1 overflow-x-auto">{memberId}</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
} 