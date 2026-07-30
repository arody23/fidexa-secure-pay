-- Admin dashboard RPC to bypass RLS for aggregated data
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    users_data jsonb;
    transactions_data jsonb;
    kyc_data jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(u)), '[]'::jsonb)
    INTO users_data
    FROM public.users u
    ORDER BY u.created_at DESC;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO transactions_data
    FROM public.transactions t
    ORDER BY t.created_at DESC
    LIMIT 50;

    SELECT COALESCE(jsonb_agg(ks), '[]'::jsonb)
    INTO kyc_data
    FROM public.get_kyc_submissions() ks;

    RETURN jsonb_build_object(
        'users', users_data,
        'transactions', transactions_data,
        'kyc_submissions', kyc_data
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_data() TO authenticated;
