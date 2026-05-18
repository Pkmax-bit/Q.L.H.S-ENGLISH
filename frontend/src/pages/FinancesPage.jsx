import { useState, useContext } from 'react'
import FinanceList from '../components/finances/FinanceList'
import FinanceSummary from '../components/finances/FinanceSummary'
import CategoryManager from '../components/finances/CategoryManager'
import TuitionInvoiceList from '../components/tuition/TuitionInvoiceList'
import TuitionPaymentDesk from '../components/tuition/TuitionPaymentDesk'
import ReceivablesReport from '../components/tuition/ReceivablesReport'
import ClassFeeSummary from '../components/tuition/ClassFeeSummary'
import { AuthContext } from '../context/AuthContext'

export default function FinancesPage() {
  const { user } = useContext(AuthContext) || {}
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState(isAdmin ? 'class_fee' : 'list')

  const tabs = [
    ...(isAdmin
      ? [
          { key: 'class_fee', label: 'Theo lớp', group: 'tuition' },
          { key: 'tuition_payment', label: 'Thu học phí', group: 'tuition' },
          { key: 'tuition_invoices', label: 'Hóa đơn học phí', group: 'tuition' },
          { key: 'receivables', label: 'Báo cáo công nợ', group: 'tuition' },
        ]
      : []),
    { key: 'list', label: 'Sổ thu chi', group: 'ledger' },
    { key: 'summary', label: 'Tổng quan', group: 'ledger' },
    { key: 'categories', label: 'Danh mục', group: 'ledger' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài chính</h1>
        <p className="text-sm text-gray-500 mt-1">
          Thu học phí, hóa đơn, công nợ và sổ thu chi
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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

      {activeTab === 'class_fee' && <ClassFeeSummary />}
      {activeTab === 'tuition_payment' && <TuitionPaymentDesk />}
      {activeTab === 'tuition_invoices' && <TuitionInvoiceList />}
      {activeTab === 'receivables' && <ReceivablesReport />}
      {activeTab === 'list' && <FinanceList />}
      {activeTab === 'summary' && <FinanceSummary />}
      {activeTab === 'categories' && <CategoryManager />}
    </div>
  )
}
