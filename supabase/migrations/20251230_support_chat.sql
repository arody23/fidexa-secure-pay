-- Support chat schema for Fidexa
-- Conversations + messages with RLS for users and admins

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    sender_id UUID,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Triggers for timestamps
CREATE OR REPLACE FUNCTION public.update_support_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_conversations_set_updated_at ON public.support_conversations;
CREATE TRIGGER support_conversations_set_updated_at
BEFORE UPDATE ON public.support_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_support_conversation_timestamp();

-- 3) RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND (u.is_admin = TRUE OR u.role = 'admin')
    );
$$;

-- Policies: conversations
DROP POLICY IF EXISTS "User can view own conversations" ON public.support_conversations;
CREATE POLICY "User can view own conversations"
ON public.support_conversations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view conversations" ON public.support_conversations;
CREATE POLICY "Admin can view conversations"
ON public.support_conversations FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "User can start conversation" ON public.support_conversations;
CREATE POLICY "User can start conversation"
ON public.support_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update conversation status" ON public.support_conversations;
CREATE POLICY "Admin can update conversation status"
ON public.support_conversations FOR UPDATE
USING (is_admin()) WITH CHECK (is_admin());

-- Policies: messages
DROP POLICY IF EXISTS "User can view own messages" ON public.support_messages;
CREATE POLICY "User can view own messages"
ON public.support_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.support_conversations c
        WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admin can view all messages" ON public.support_messages;
CREATE POLICY "Admin can view all messages"
ON public.support_messages FOR SELECT
USING (is_admin());

DROP POLICY IF EXISTS "User can send messages" ON public.support_messages;
CREATE POLICY "User can send messages"
ON public.support_messages FOR INSERT
WITH CHECK (
    sender_type = 'user' AND auth.uid() = sender_id AND EXISTS (
        SELECT 1 FROM public.support_conversations c
        WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admin can send messages" ON public.support_messages;
CREATE POLICY "Admin can send messages"
ON public.support_messages FOR INSERT
WITH CHECK (
    sender_type = 'admin' AND is_admin()
);

-- Optional: prevent updates/deletes (append-only)
DROP POLICY IF EXISTS "No updates on support messages" ON public.support_messages;
CREATE POLICY "No updates on support messages"
ON public.support_messages FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No deletes on support messages" ON public.support_messages;
CREATE POLICY "No deletes on support messages"
ON public.support_messages FOR DELETE USING (false);
