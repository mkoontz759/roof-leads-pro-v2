'use client'

import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
          <h1 className="text-3xl font-bold mb-4">Something went wrong!</h1>
          <p className="text-muted-foreground mb-8">
            An unexpected error occurred in the application.
          </p>
          <Button
            onClick={
              // Attempt to recover by trying to re-render the root segment
              () => reset()
            }
          >
            Try again
          </Button>
        </div>
      </body>
    </html>
  )
} 