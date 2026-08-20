-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for booking status
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'en_route', 'completed', 'cancelled');

-- 1. Driver Profiles Table
-- The id serves as the tenant_id and should match auth.uid() from Supabase Auth
CREATE TABLE public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    full_name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    license_plate TEXT NOT NULL,
    stripe_account_id TEXT,
    onboarding_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Fare Rules Table
-- Contains a constraint to ensure each driver only has one active fare rule profile
CREATE TABLE public.fare_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    base_fare NUMERIC NOT NULL DEFAULT 0.0,
    per_km_rate NUMERIC NOT NULL DEFAULT 0.0,
    minimum_fare NUMERIC NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_tenant_fare_rule UNIQUE (tenant_id)
);

-- 3. Bookings Table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    passenger_name TEXT NOT NULL,
    passenger_phone TEXT NOT NULL,
    pickup_lat NUMERIC NOT NULL,
    pickup_lng NUMERIC NOT NULL,
    dropoff_lat NUMERIC NOT NULL,
    dropoff_lng NUMERIC NOT NULL,
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE NOT NULL,
    quoted_price NUMERIC NOT NULL,
    status booking_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Live Tracking Table
CREATE TABLE public.live_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    current_lat NUMERIC NOT NULL,
    current_lng NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach the trigger to all tables
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_fare_rules_updated_at BEFORE UPDATE ON public.fare_rules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_live_tracking_updated_at BEFORE UPDATE ON public.live_tracking FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security on all tables
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_tracking ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- RLS Policies for driver_profiles
-- ------------------------------------------

-- Drivers can fully manage their own profile row
CREATE POLICY "Drivers can manage their own profile" ON public.driver_profiles
    FOR ALL
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Anonymous and authenticated users (passengers) can view driver profiles to get tenant details
CREATE POLICY "Anyone can view driver profiles" ON public.driver_profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ------------------------------------------
-- RLS Policies for fare_rules
-- ------------------------------------------

-- Drivers can manage their own fare rules based on tenant_id
CREATE POLICY "Drivers can manage their own fare rules" ON public.fare_rules
    FOR ALL
    TO authenticated
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- Passengers need to read fare rules to calculate quotes
CREATE POLICY "Anyone can view fare rules" ON public.fare_rules
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ------------------------------------------
-- RLS Policies for bookings
-- ------------------------------------------

-- Drivers can view, accept, and manage bookings assigned to their tenant_id
CREATE POLICY "Drivers can manage bookings for their tenant" ON public.bookings
    FOR ALL
    TO authenticated
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- Passengers can create a booking request anonymously (or authenticated)
CREATE POLICY "Anyone can insert a booking" ON public.bookings
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- ------------------------------------------
-- RLS Policies for live_tracking
-- ------------------------------------------

-- Drivers can update their live location for their tenant_id
CREATE POLICY "Drivers can manage their live tracking" ON public.live_tracking
    FOR ALL
    TO authenticated
    USING (tenant_id = auth.uid())
    WITH CHECK (tenant_id = auth.uid());

-- Passengers can view the live tracking data
CREATE POLICY "Anyone can view live tracking" ON public.live_tracking
    FOR SELECT
    TO anon, authenticated
    USING (true);
