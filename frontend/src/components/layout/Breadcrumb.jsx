import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm mb-4">
      <Link to="/dashboard" className="text-stone-400 hover:text-amber-700 transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-amber-300/80" />
          {item.href ? (
            <Link to={item.href} className="text-stone-500 hover:text-amber-700 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-stone-800 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
