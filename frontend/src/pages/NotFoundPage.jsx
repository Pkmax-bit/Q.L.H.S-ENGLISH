import { Link } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'
import Button from '../components/common/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-6">Trang bạn tìm không tồn tại</p>
        <Link to="/">
          <Button>
            <Home className="w-4 h-4 mr-2" />
            Về trang chủ
          </Button>
        </Link>
      </div>
    </div>
  )
}
