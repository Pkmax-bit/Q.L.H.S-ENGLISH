import { useState } from 'react'
import FinanceList from '../components/finances/FinanceList'
import FinanceSummary from '../components/finances/FinanceSummary'
import CategoryManager from '../components/finances/CategoryManager'

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState('list')

  const tabs = [
    { key: 'list', label: 'Danh sách' },
    { key: 'summary', label: 'Tổng quan' },
    { key: 'categories', label: 'Danh mục' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài chính</h1>
        <p className="text-sm text-gray-500 mt-1">Thu chi, báo cáo và danh mục tài chính</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'list' && <FinanceList />}
      {activeTab === 'summary' && <FinanceSummary />}
      {activeTab === 'categories' && <CategoryManager />}
    </div>
  )
}
