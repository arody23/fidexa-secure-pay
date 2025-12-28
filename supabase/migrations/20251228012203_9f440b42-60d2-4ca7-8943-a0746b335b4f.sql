-- Create table for payment links
CREATE TABLE public.payment_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id TEXT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    delivery_days INTEGER NOT NULL DEFAULT 7,
    client_name TEXT,
    client_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'delivered', 'disputed', 'cancelled')),
    is_paid BOOLEAN NOT NULL DEFAULT false,
    provider_name TEXT NOT NULL DEFAULT 'Prestataire FIDEXA',
    provider_avatar TEXT DEFAULT 'FX',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (clients need to view payment links without auth)
CREATE POLICY "Anyone can view payment links by link_id"
ON public.payment_links
FOR SELECT
USING (true);

-- Create policy for public insert (for now, anyone can create payment links - will add auth later)
CREATE POLICY "Anyone can create payment links"
ON public.payment_links
FOR INSERT
WITH CHECK (true);

-- Create policy for public update (for payment status updates)
CREATE POLICY "Anyone can update payment links"
ON public.payment_links
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_links_updated_at
BEFORE UPDATE ON public.payment_links
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_links_updated_at();

-- Enable realtime for payment_links table
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_links;