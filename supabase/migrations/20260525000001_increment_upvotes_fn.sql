-- Atomic upvote increment to prevent lost-update race conditions.
-- Replaces the client-side read-then-write pattern in useUpvoteQuestion().
create or replace function increment_upvotes(question_id uuid)
returns void
language sql
security definer
as $$
  update questions set upvotes = upvotes + 1 where id = question_id;
$$;
