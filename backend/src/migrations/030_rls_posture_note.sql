-- Harden SECURITY DEFINER helpers and function search_path (Supabase advisors).
-- App auth is Express + service role; RLS without policies = deny for anon PostgREST (intentional).

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

ALTER FUNCTION public.set_tuition_invoice_no() SET search_path = public;
ALTER FUNCTION public.set_tuition_receipt_no() SET search_path = public;
ALTER FUNCTION public.sync_invoice_from_payments() SET search_path = public;
