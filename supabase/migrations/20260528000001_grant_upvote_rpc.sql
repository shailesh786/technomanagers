-- Grant execute permission on increment_upvotes to authenticated and anon roles.
-- The function is SECURITY DEFINER so it runs as the owner (bypasses RLS on questions),
-- but without this GRANT the PostgREST layer rejects calls from non-superuser roles.
GRANT EXECUTE ON FUNCTION public.increment_upvotes(uuid) TO anon, authenticated;
