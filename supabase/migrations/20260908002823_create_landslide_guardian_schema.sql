/*
# Landslide Guardian 360 — Core Schema

## Purpose
Disaster-management command-center for monitoring landslide risks across the
North Eastern Region (NER) of India. Stores monitored locations, AI risk
predictions, citizen/field reports, and operational alerts.

## New Tables

### locations
- id (uuid PK)
- name (text, unique) — human-readable location name
- state (text) — NER state (Sikkim, Mizoram, Manipur, Meghalaya, Assam)
- latitude (numeric) — approx latitude
- longitude (numeric) — approx longitude
- exposed_population (integer) — people at risk
- critical_infrastructure (text[]) — list of exposed infrastructure
- road_exposure (text) — road corridor name or "None"
- railway_exposure (text) — railway name or "None"
- evacuation_difficulty (text) — LOW / MODERATE / HIGH / EXTREME
- accessibility (text) — EASY / MODERATE / DIFFICULT / SEVERE
- historical_landslides (integer) — count of past events
- created_at (timestamptz)

### risk_predictions
- id (uuid PK)
- location_id (uuid FK -> locations.id ON DELETE CASCADE)
- risk_score (numeric 0-100)
- risk_level (text) — LOW / MODERATE / MEDIUM / HIGH / CRITICAL
- confidence (numeric 0-100) — prediction confidence %
- rainfall_24h (numeric) — mm in last 24h
- soil_moisture (numeric) — % saturation
- slope_angle (numeric) — degrees
- risk_factors (text[]) — explanatory factors
- recommended_actions (text[]) — suggested response
- prediction_time (timestamptz, default now())
- is_demo (boolean, default false) — marks simulated/demo data

### field_reports
- id (uuid PK)
- location_id (uuid FK -> locations.id, nullable)
- location_name (text) — denormalized for reports without a linked location
- description (text)
- reporter_name (text, nullable)
- reporter_contact (text, nullable)
- risk_level (text) — LOW / MODERATE / MEDIUM / HIGH / CRITICAL
- status (text, default 'SUBMITTED') — SUBMITTED / VERIFIED / RESOLVED
- image_url (text, nullable)
- created_at (timestamptz, default now())

### alerts
- id (uuid PK)
- location_id (uuid FK -> locations.id, nullable)
- location_name (text)
- severity (text) — MEDIUM / HIGH / CRITICAL
- reason (text)
- recommended_response (text)
- status (text, default 'ACTIVE') — ACTIVE / RESOLVED
- created_at (timestamptz, default now())
- resolved_at (timestamptz, nullable)

## Security (RLS)
This is a no-auth single-tenant command-center prototype — all data is
intentionally shared/public. RLS enabled on all tables, with anon+authenticated
CRUD policies (USING true) so the anon-key frontend can operate.
*/

-- ============ locations ============
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  state text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  exposed_population integer NOT NULL DEFAULT 0,
  critical_infrastructure text[] NOT NULL DEFAULT '{}',
  road_exposure text NOT NULL DEFAULT 'None',
  railway_exposure text NOT NULL DEFAULT 'None',
  evacuation_difficulty text NOT NULL DEFAULT 'MODERATE',
  accessibility text NOT NULL DEFAULT 'MODERATE',
  historical_landslides integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_locations" ON public.locations;
CREATE POLICY "anon_select_locations" ON public.locations FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_locations" ON public.locations;
CREATE POLICY "anon_insert_locations" ON public.locations FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_locations" ON public.locations;
CREATE POLICY "anon_update_locations" ON public.locations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_locations" ON public.locations;
CREATE POLICY "anon_delete_locations" ON public.locations FOR DELETE
  TO anon, authenticated USING (true);

-- ============ risk_predictions ============
CREATE TABLE IF NOT EXISTS public.risk_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  risk_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'LOW',
  confidence numeric NOT NULL DEFAULT 0,
  rainfall_24h numeric NOT NULL DEFAULT 0,
  soil_moisture numeric NOT NULL DEFAULT 0,
  slope_angle numeric NOT NULL DEFAULT 0,
  risk_factors text[] NOT NULL DEFAULT '{}',
  recommended_actions text[] NOT NULL DEFAULT '{}',
  prediction_time timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false
);
ALTER TABLE public.risk_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_risk_predictions" ON public.risk_predictions;
CREATE POLICY "anon_select_risk_predictions" ON public.risk_predictions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_risk_predictions" ON public.risk_predictions;
CREATE POLICY "anon_insert_risk_predictions" ON public.risk_predictions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_risk_predictions" ON public.risk_predictions;
CREATE POLICY "anon_update_risk_predictions" ON public.risk_predictions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_risk_predictions" ON public.risk_predictions;
CREATE POLICY "anon_delete_risk_predictions" ON public.risk_predictions FOR DELETE
  TO anon, authenticated USING (true);

-- ============ field_reports ============
CREATE TABLE IF NOT EXISTS public.field_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  description text NOT NULL,
  reporter_name text,
  reporter_contact text,
  risk_level text NOT NULL DEFAULT 'LOW',
  status text NOT NULL DEFAULT 'SUBMITTED',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_field_reports" ON public.field_reports;
CREATE POLICY "anon_select_field_reports" ON public.field_reports FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_field_reports" ON public.field_reports;
CREATE POLICY "anon_insert_field_reports" ON public.field_reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_field_reports" ON public.field_reports;
CREATE POLICY "anon_update_field_reports" ON public.field_reports FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_field_reports" ON public.field_reports;
CREATE POLICY "anon_delete_field_reports" ON public.field_reports FOR DELETE
  TO anon, authenticated USING (true);

-- ============ alerts ============
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  severity text NOT NULL DEFAULT 'MEDIUM',
  reason text NOT NULL,
  recommended_response text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alerts" ON public.alerts;
CREATE POLICY "anon_select_alerts" ON public.alerts FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON public.alerts;
CREATE POLICY "anon_insert_alerts" ON public.alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON public.alerts;
CREATE POLICY "anon_update_alerts" ON public.alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON public.alerts;
CREATE POLICY "anon_delete_alerts" ON public.alerts FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_risk_predictions_location_id ON public.risk_predictions(location_id);
CREATE INDEX IF NOT EXISTS idx_risk_predictions_prediction_time ON public.risk_predictions(prediction_time DESC);
CREATE INDEX IF NOT EXISTS idx_field_reports_created_at ON public.field_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);