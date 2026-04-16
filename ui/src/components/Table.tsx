import { ReactNode } from 'react'
import { cn } from '@cloudflare/kumo'

interface TableProps { children: ReactNode; className?: string }
interface TableHeaderProps { children: ReactNode }
interface TableBodyProps { children: ReactNode }
interface TableRowProps { children: ReactNode; className?: string }
interface TableHeadProps { children: ReactNode; className?: string }
interface TableCellProps { children: ReactNode; className?: string }

export function Table({ children, className }: TableProps) {
  return <table className={cn('w-full text-base', className)}>{children}</table>
}

export function TableHeader({ children }: TableHeaderProps) {
  return <thead><tr className="bg-kumo-base">{children}</tr></thead>
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children, className }: TableRowProps) {
  return <tr className={className}>{children}</tr>
}

export function TableHead({ children, className }: TableHeadProps) {
  return (
    <th className={cn('text-left p-3 first:pl-4 border-b border-kumo-line', className)}>
      <div className="flex items-center gap-2">{children}</div>
    </th>
  )
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn('px-3 first:pl-4 py-2 sm:py-1.5 border-b border-kumo-line', className)}>
      <div className="line-clamp-1 text-ellipsis">{children}</div>
    </td>
  )
}
