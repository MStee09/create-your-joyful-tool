-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  notes TEXT,
  contacts JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vendors" ON public.vendors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own vendors" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vendors" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vendors" ON public.vendors FOR DELETE USING (auth.uid() = user_id);

-- Create product_masters table
CREATE TABLE public.product_masters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  form TEXT NOT NULL DEFAULT 'liquid',
  default_unit TEXT DEFAULT 'gal',
  density_lbs_per_gal NUMERIC,
  analysis JSONB,
  general_notes TEXT,
  mixing_notes TEXT,
  crop_rate_notes TEXT,
  label_file_name TEXT,
  sds_file_name TEXT,
  reorder_point NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_masters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own products" ON public.product_masters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own products" ON public.product_masters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON public.product_masters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON public.product_masters FOR DELETE USING (auth.uid() = user_id);

-- Create vendor_offerings table
CREATE TABLE public.vendor_offerings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.product_masters(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  price_unit TEXT DEFAULT 'gal',
  sku TEXT,
  min_order TEXT,
  freight_terms TEXT,
  last_quoted_date DATE,
  is_preferred BOOLEAN DEFAULT false,
  packaging_options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_offerings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own offerings" ON public.vendor_offerings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own offerings" ON public.vendor_offerings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own offerings" ON public.vendor_offerings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own offerings" ON public.vendor_offerings FOR DELETE USING (auth.uid() = user_id);

-- Create seasons table (crops stored as JSONB for simplicity)
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  crops JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seasons" ON public.seasons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own seasons" ON public.seasons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own seasons" ON public.seasons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own seasons" ON public.seasons FOR DELETE USING (auth.uid() = user_id);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.product_masters(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'gal',
  packaging_name TEXT,
  packaging_size NUMERIC,
  container_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory" ON public.inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own inventory" ON public.inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own inventory" ON public.inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own inventory" ON public.inventory FOR DELETE USING (auth.uid() = user_id);

-- Create procurement tables
CREATE TABLE public.commodity_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'ton',
  analysis JSONB,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.commodity_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own specs" ON public.commodity_specs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own specs" ON public.commodity_specs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own specs" ON public.commodity_specs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own specs" ON public.commodity_specs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.bid_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  due_date DATE,
  invited_vendor_ids TEXT[] DEFAULT '{}',
  vendor_invitations JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bid_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bid events" ON public.bid_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bid events" ON public.bid_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bid events" ON public.bid_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bid events" ON public.bid_events FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.vendor_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bid_event_id UUID NOT NULL REFERENCES public.bid_events(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  commodity_spec_id UUID NOT NULL REFERENCES public.commodity_specs(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  delivery_terms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotes" ON public.vendor_quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quotes" ON public.vendor_quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quotes" ON public.vendor_quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quotes" ON public.vendor_quotes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bid_event_id UUID NOT NULL REFERENCES public.bid_events(id) ON DELETE CASCADE,
  vendor_quote_id UUID NOT NULL REFERENCES public.vendor_quotes(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own awards" ON public.awards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own awards" ON public.awards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own awards" ON public.awards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own awards" ON public.awards FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.price_book (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  commodity_spec_id UUID REFERENCES public.commodity_specs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.product_masters(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  unit TEXT DEFAULT 'ton',
  source TEXT DEFAULT 'manual',
  effective_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.price_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own price book" ON public.price_book FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own price book" ON public.price_book FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own price book" ON public.price_book FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own price book" ON public.price_book FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_masters_updated_at BEFORE UPDATE ON public.product_masters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendor_offerings_updated_at BEFORE UPDATE ON public.vendor_offerings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bid_events_updated_at BEFORE UPDATE ON public.bid_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();