-- Create purchases table
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('ordered', 'received', 'partial')),
  invoice_number TEXT,
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_transactions table
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.product_masters(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'application', 'adjustment', 'return', 'carryover')),
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'gal',
  reference_id UUID,
  reference_type TEXT CHECK (reference_type IN ('purchase', 'application', 'adjustment')),
  season_year INTEGER NOT NULL,
  notes TEXT,
  unit_cost NUMERIC,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_history table (separate from price_book for historical tracking)
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.product_masters(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  unit_price NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'gal',
  season_year INTEGER NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchases
CREATE POLICY "Users can view their own purchases" 
  ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchases" 
  ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own purchases" 
  ON public.purchases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own purchases" 
  ON public.purchases FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for inventory_transactions
CREATE POLICY "Users can view their own transactions" 
  ON public.inventory_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" 
  ON public.inventory_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" 
  ON public.inventory_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" 
  ON public.inventory_transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for price_history
CREATE POLICY "Users can view their own price history" 
  ON public.price_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own price history" 
  ON public.price_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own price history" 
  ON public.price_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own price history" 
  ON public.price_history FOR DELETE USING (auth.uid() = user_id);

-- Create update timestamp trigger for purchases
CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();