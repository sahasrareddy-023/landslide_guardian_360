export type RiskLevel = 'LOW' | 'MODERATE' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertSeverity = 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export type ReportStatus = 'SUBMITTED' | 'VERIFIED' | 'RESOLVED';

export interface Location {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  exposed_population: number;
  critical_infrastructure: string[];
  road_exposure: string;
  railway_exposure: string;
  evacuation_difficulty: string;
  accessibility: string;
  historical_landslides: number;
  created_at: string;
}

export interface RiskPrediction {
  id: string;
  location_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  rainfall_24h: number;
  soil_moisture: number;
  slope_angle: number;
  risk_factors: string[];
  recommended_actions: string[];
  prediction_time: string;
  is_demo: boolean;
}

/** Joined location + its latest risk prediction, used throughout the UI */
export interface LocationWithRisk extends Location {
  latest_prediction: RiskPrediction | null;
}

export interface FieldReport {
  id: string;
  location_id: string | null;
  location_name: string;
  description: string;
  reporter_name: string | null;
  reporter_contact: string | null;
  risk_level: RiskLevel;
  status: ReportStatus;
  image_url: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  location_id: string | null;
  location_name: string;
  severity: AlertSeverity;
  reason: string;
  recommended_response: string;
  status: AlertStatus;
  created_at: string;
  resolved_at: string | null;
}

export type ViewKey =
  | 'command'
  | 'prediction'
  | 'intelligence'
  | 'map'
  | 'impact'
  | 'priority'
  | 'community'
  | 'alerts'
  | 'analytics';

export interface IntelFeedEvent {
  id: string;
  timestamp: number;
  type: 'risk_up' | 'risk_down' | 'rainfall' | 'soil' | 'report' | 'alert' | 'priority' | 'action' | 'info';
  message: string;
  severity: RiskLevel | 'INFO';
}
