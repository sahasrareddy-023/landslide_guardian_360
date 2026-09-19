/*
# Seed Initial NER Locations and Risk Predictions

## Purpose
Populate the command center with five real NER (North Eastern Region) landslide
hotspot locations, each with a current risk prediction record. This gives the
dashboard meaningful data on first load.

## Data Inserted
- 5 locations: NH-10 Teesta Valley, Lunglei South Ridge, Noney Railway Bridge,
  Sohra/Cherrapunji, Guwahati West/Kamakhya
- 5 risk_predictions (one per location) with realistic telemetry values
- 3 initial field reports
- 3 initial alerts

## Notes
- Uses ON CONFLICT (name) DO NOTHING so re-running is safe (idempotent).
- Risk predictions are linked to locations via sub-selects on location name.
- is_demo = false for these baseline records (they are the "live" baseline).
*/

-- ============ Locations ============
INSERT INTO public.locations (name, state, latitude, longitude, exposed_population, critical_infrastructure, road_exposure, railway_exposure, evacuation_difficulty, accessibility, historical_landslides)
VALUES
  ('NH-10 Teesta Valley Corridor', 'Sikkim', 27.2333, 88.5667, 12000,
   ARRAY['NH-10 Highway', 'Teesta River Bridge', 'Teesta Stage-III Dam'],
   'NH-10 Highway', 'Sevoke–Rangpo Railway', 'EXTREME', 'DIFFICULT', 47)
  ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locations (name, state, latitude, longitude, exposed_population, critical_infrastructure, road_exposure, railway_exposure, evacuation_difficulty, accessibility, historical_landslides)
VALUES
  ('Lunglei South Ridge Slope', 'Mizoram', 22.8667, 92.7500, 4500,
   ARRAY['Lunglei Town Water Supply', 'District Hospital'],
   'Lunglei–Aizawl Road', 'None', 'HIGH', 'DIFFICULT', 18)
  ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locations (name, state, latitude, longitude, exposed_population, critical_infrastructure, road_exposure, railway_exposure, evacuation_difficulty, accessibility, historical_landslides)
VALUES
  ('Noney Railway Bridge Access Corridor', 'Manipur', 24.7000, 93.5500, 3000,
   ARRAY['Jiribam–Imphal Railway Bridge', 'Barak River Crossing'],
   'None', 'Jiribam–Imphal Railway', 'EXTREME', 'SEVERE', 22)
  ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locations (name, state, latitude, longitude, exposed_population, critical_infrastructure, road_exposure, railway_exposure, evacuation_difficulty, accessibility, historical_landslides)
VALUES
  ('Sohra / Cherrapunji Cliff Escarpment', 'Meghalaya', 25.2700, 91.7320, 6800,
   ARRAY['Cherrapunji Market Town', 'Living Root Bridge Heritage Site'],
   'SH-5 Sohra Road', 'None', 'HIGH', 'MODERATE', 35)
  ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locations (name, state, latitude, longitude, exposed_population, critical_infrastructure, road_exposure, railway_exposure, evacuation_difficulty, accessibility, historical_landslides)
VALUES
  ('Guwahati West / Kamakhya Hillside', 'Assam', 26.1700, 91.6900, 8500,
   ARRAY['Kamakhya Temple', 'NH-17 Bypass', 'City Water Treatment Plant'],
   'NH-17 Bypass', 'None', 'MODERATE', 'EASY', 12)
  ON CONFLICT (name) DO NOTHING;

-- ============ Risk Predictions (one per location) ============
INSERT INTO public.risk_predictions (location_id, risk_score, risk_level, confidence, rainfall_24h, soil_moisture, slope_angle, risk_factors, recommended_actions, prediction_time, is_demo)
SELECT id, 82, 'HIGH', 91, 112.5, 88, 42,
  ARRAY['Heavy rainfall 112mm in 24h', 'Soil saturation at 88%', 'Steep slope 42°', 'Proximity to Teesta River erosion zone', '47 historical landslide events'],
  ARRAY['Deploy NDRF team to Teesta Valley', 'Restrict NH-10 traffic to essential vehicles', 'Activate evacuation shelters in Singtam', 'Monitor Teesta River water level hourly'],
  now(), false
FROM public.locations WHERE name = 'NH-10 Teesta Valley Corridor'
AND NOT EXISTS (SELECT 1 FROM public.risk_predictions rp WHERE rp.location_id = public.locations.id);

INSERT INTO public.risk_predictions (location_id, risk_score, risk_level, confidence, rainfall_24h, soil_moisture, slope_angle, risk_factors, recommended_actions, prediction_time, is_demo)
SELECT id, 64, 'MEDIUM', 84, 56.2, 71, 35,
  ARRAY['Moderate rainfall 56mm in 24h', 'Soil moisture rising', 'Ridge slope 35°', '18 historical landslide events'],
  ARRAY['Increase slope monitoring frequency', 'Pre-position response equipment', 'Alert district administration'],
  now(), false
FROM public.locations WHERE name = 'Lunglei South Ridge Slope'
AND NOT EXISTS (SELECT 1 FROM public.risk_predictions rp WHERE rp.location_id = public.locations.id);

INSERT INTO public.risk_predictions (location_id, risk_score, risk_level, confidence, rainfall_24h, soil_moisture, slope_angle, risk_factors, recommended_actions, prediction_time, is_demo)
SELECT id, 73, 'HIGH', 87, 78.0, 82, 38,
  ARRAY['Heavy rainfall 78mm in 24h', 'High soil saturation 82%', 'Slope 38° above railway bridge', '22 historical events', 'Critical railway infrastructure at risk'],
  ARRAY['Halt railway construction activities', 'Deploy geological survey team', 'Evacuate workers from bridge corridor', 'Daily slope stability assessment'],
  now(), false
FROM public.locations WHERE name = 'Noney Railway Bridge Access Corridor'
AND NOT EXISTS (SELECT 1 FROM public.risk_predictions rp WHERE rp.location_id = public.locations.id);

INSERT INTO public.risk_predictions (location_id, risk_score, risk_level, confidence, rainfall_24h, soil_moisture, slope_angle, risk_factors, recommended_actions, prediction_time, is_demo)
SELECT id, 55, 'MEDIUM', 79, 94.0, 68, 55,
  ARRAY['Very heavy rainfall 94mm (Cherrapunji climate)', 'Cliff escarpment slope 55°', 'Highly weathered limestone geology', '35 historical events'],
  ARRAY['Monitor cliff edge stability', 'Restrict tourist access to viewpoints', 'Maintain drainage channels', 'Pre-alert emergency shelters'],
  now(), false
FROM public.locations WHERE name = 'Sohra / Cherrapunji Cliff Escarpment'
AND NOT EXISTS (SELECT 1 FROM public.risk_predictions rp WHERE rp.location_id = public.locations.id);

INSERT INTO public.risk_predictions (location_id, risk_score, risk_level, confidence, rainfall_24h, soil_moisture, slope_angle, risk_factors, recommended_actions, prediction_time, is_demo)
SELECT id, 38, 'MODERATE', 75, 22.5, 54, 28,
  ARRAY['Light rainfall 22mm in 24h', 'Moderate soil moisture', 'Urban hillside slope 28°', '12 historical events'],
  ARRAY['Routine slope monitoring', 'Clear drainage infrastructure', 'Public awareness for hillside residents'],
  now(), false
FROM public.locations WHERE name = 'Guwahati West / Kamakhya Hillside'
AND NOT EXISTS (SELECT 1 FROM public.risk_predictions rp WHERE rp.location_id = public.locations.id);

-- ============ Field Reports ============
INSERT INTO public.field_reports (location_id, location_name, description, reporter_name, reporter_contact, risk_level, status)
SELECT id, 'NH-10 Teesta Valley Corridor', 'Large cracks appeared on hillside above NH-10 near Singtam. Water seepage visible from road cut slope.',
  'Ramesh Gurung', '+91-98300XXXXX', 'HIGH', 'VERIFIED'
FROM public.locations WHERE name = 'NH-10 Teesta Valley Corridor'
AND NOT EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.location_name = 'NH-10 Teesta Valley Corridor' AND fr.description LIKE 'Large cracks%');

INSERT INTO public.field_reports (location_id, location_name, description, reporter_name, reporter_contact, risk_level, status)
SELECT id, 'Sohra / Cherrapunji Cliff Escarpment', 'Rockfall debris on SH-5 near Mawsmai village. Road partially blocked, vehicles diverting.',
  'Community Sentinel – Mawsmai', '+91-97000XXXXX', 'MEDIUM', 'SUBMITTED'
FROM public.locations WHERE name = 'Sohra / Cherrapunji Cliff Escarpment'
AND NOT EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.location_name = 'Sohra / Cherrapunji Cliff Escarpment' AND fr.description LIKE 'Rockfall debris%');

INSERT INTO public.field_reports (location_id, location_name, description, reporter_name, reporter_contact, risk_level, status)
SELECT id, 'Lunglei South Ridge Slope', 'Minor surface slip observed on Lunglei–Aizawl road. No injuries, road still passable.',
  'Zoramthangi', '+91-98000XXXXX', 'MODERATE', 'SUBMITTED'
FROM public.locations WHERE name = 'Lunglei South Ridge Slope'
AND NOT EXISTS (SELECT 1 FROM public.field_reports fr WHERE fr.location_name = 'Lunglei South Ridge Slope' AND fr.description LIKE 'Minor surface slip%');

-- ============ Alerts ============
INSERT INTO public.alerts (location_id, location_name, severity, reason, recommended_response, status)
SELECT id, 'NH-10 Teesta Valley Corridor', 'CRITICAL',
  'Risk score 82 — heavy rainfall (112mm) and soil saturation (88%) creating imminent landslide threat on NH-10 corridor.',
  'Deploy NDRF, restrict highway traffic, activate evacuation shelters immediately.', 'ACTIVE'
FROM public.locations WHERE name = 'NH-10 Teesta Valley Corridor'
AND NOT EXISTS (SELECT 1 FROM public.alerts a WHERE a.location_name = 'NH-10 Teesta Valley Corridor' AND a.severity = 'CRITICAL');

INSERT INTO public.alerts (location_id, location_name, severity, reason, recommended_response, status)
SELECT id, 'Noney Railway Bridge Access Corridor', 'HIGH',
  'Risk score 73 — high rainfall and soil saturation threatening railway bridge access corridor.',
  'Halt construction, evacuate workers, deploy geological survey team.', 'ACTIVE'
FROM public.locations WHERE name = 'Noney Railway Bridge Access Corridor'
AND NOT EXISTS (SELECT 1 FROM public.alerts a WHERE a.location_name = 'Noney Railway Bridge Access Corridor' AND a.severity = 'HIGH');

INSERT INTO public.alerts (location_id, location_name, severity, reason, recommended_response, status)
SELECT id, 'Sohra / Cherrapunji Cliff Escarpment', 'MEDIUM',
  'Risk score 55 — cliff escarpment under heavy monsoon rainfall, rockfall debris reported.',
  'Monitor cliff stability, restrict tourist viewpoints, maintain drainage.', 'ACTIVE'
FROM public.locations WHERE name = 'Sohra / Cherrapunji Cliff Escarpment'
AND NOT EXISTS (SELECT 1 FROM public.alerts a WHERE a.location_name = 'Sohra / Cherrapunji Cliff Escarpment' AND a.severity = 'MEDIUM');