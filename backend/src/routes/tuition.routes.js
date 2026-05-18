const { Router } = require('express');
const ctrl = require('../controllers/tuition.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/invoices', auth, ctrl.getInvoices);
router.get('/invoices/:id', auth, ctrl.getInvoiceById);
router.post('/invoices', auth, authorize('admin'), ctrl.createInvoice);
router.put('/invoices/:id', auth, authorize('admin'), ctrl.updateInvoice);
router.delete('/invoices/:id', auth, authorize('admin'), ctrl.removeInvoice);

router.post('/invoices/generate', auth, authorize('admin'), ctrl.generateInvoices);

router.post('/invoices/:id/payments', auth, authorize('admin'), ctrl.recordPayment);
router.delete('/payments/:paymentId', auth, authorize('admin'), ctrl.removePayment);

router.get('/reports/receivables', auth, authorize('admin'), ctrl.getReceivables);
router.get('/reports/receivables/export', auth, authorize('admin'), ctrl.exportReceivables);
router.get('/reports/revenue', auth, authorize('admin'), ctrl.getRevenue);

router.get('/students/:studentId/ledger', auth, ctrl.getStudentLedger);

router.get('/classes-summary', auth, authorize('admin'), ctrl.getClassesSummary);
router.get('/classes/:classId/students', auth, authorize('admin'), ctrl.getClassStudents);
router.get('/classes/:classId/fee-projection', auth, ctrl.getClassFeeProjection);

module.exports = router;
