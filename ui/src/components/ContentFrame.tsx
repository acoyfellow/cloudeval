import { ReactNode } from 'react'

interface ContentFrameProps {
  children: ReactNode
}

export default function ContentFrame({ children }: ContentFrameProps) {
  return (
    <div className="relative flex flex-1 min-h-[calc(100vh-58px)]">
      <div className="hidden md:block -mt-[53px] w-[59px] shrink-0 bg-kumo-control border-r border-kumo-line" />
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col gap-6">{children}</div>
      </div>
      <div className="hidden md:block -mt-[53px] w-[59px] shrink-0 border-l border-kumo-line bg-kumo-control" />
    </div>
  )
}
