import type { LocationWithRisk, RiskLevel } from '@/types';
import { scoreToLevel } from '@/lib/risk';

// ──────────────────────────────────────────────────────────
// Factor contribution weights for XAI
// ──────────────────────────────────────────────────────────
export interface FactorContribution {
  factor: string;
  weight: number; // 0-100 relative contribution
  value: string; // human-readable value
  direction: 'up' | 'down' | 'stable';
  contribution: 'Very High' | 'High' | 'Moderate' | 'Low' | 'Minimal';
}

export interface PredictionResult {
  currentScore: number;
  currentLevel: RiskLevel;
  predictedScore: number;
  predictedLevel: RiskLevel;
  trendDirection: 'escalating' | 'stable' | 'decreasing';
  probability: number; // 0-100 chance of reaching predicted level
  timeframe: string; // e.g. "6-12 hours"
  factors: FactorContribution[];
  summary: string; // GenAI-style readable summary
  confidence: number;
}

// ──────────────────────────────────────────────────────────
// Sensor data point (simulated incoming telemetry)
// ──────────────────────────────────────────────────────────
export interface SensorReading {
  timestamp: number;
  rainfall: number; // mm/h
  soilMoisture: number; // %
  groundMovement: number; // mm/day (inclinometer displacement)
  slopeAngle: number; // degrees
  temperature: number; // °C
}

export interface SensorSource {
  id: string;
  name: string;
  type: 'rain' | 'soil' | 'inclinometer' | 'weather' | 'sar';
  status: 'online' | 'offline' | 'warning';
  lastReading: string;
  icon: string;
}

// ──────────────────────────────────────────────────────────
// Simulated sensor sources per location type
// ──────────────────────────────────────────────────────────
export function getSensorSources(): SensorSource[] {
  return [
    { id: 'rain-01', name: 'Rain Gauge Network', type: 'rain', status: 'online', lastReading: '2s ago', icon: 'rain' },
    { id: 'soil-01', name: 'Soil Moisture Sensors', type: 'soil', status: 'online', lastReading: '5s ago', icon: 'soil' },
    { id: 'inc-01', name: 'Inclinometer Array', type: 'inclinometer', status: 'online', lastReading: '1s ago', icon: 'inclinometer' },
    { id: 'wx-01', name: 'IMD Weather API', type: 'weather', status: 'online', lastReading: '30s ago', icon: 'weather' },
    { id: 'sar-01', name: 'Sentinel-1 SAR Data', type: 'sar', status: 'online', lastReading: '6h ago', icon: 'sar' },
  ];
}

// ──────────────────────────────────────────────────────────
// Generate a simulated sensor reading based on current prediction data
// ──────────────────────────────────────────────────────────
export function generateSensorReading(pred: {
  rainfall_24h: number;
  soil_moisture: number;
  slope_angle: number;
}): SensorReading {
  const rainfallRate = pred.rainfall_24h / 24 + (Math.random() - 0.4) * 3;
  const groundMovement = pred.soil_moisture > 75 ? Math.random() * 2.5 + 0.5 : Math.random() * 0.8;
  return {
    timestamp: Date.now(),
    rainfall: Math.max(0, rainfallRate),
    soilMoisture: pred.soil_moisture + (Math.random() - 0.5) * 3,
    groundMovement,
    slopeAngle: pred.slope_angle,
    temperature: 18 + Math.random() * 8,
  };
}

// ──────────────────────────────────────────────────────────
// Core prediction engine: takes current data + trend → predicts future risk
// ──────────────────────────────────────────────────────────
export function predictFutureRisk(
  location: LocationWithRisk,
  recentReadings: SensorReading[],
): PredictionResult {
  const pred = location.latest_prediction;
  const currentScore = pred?.risk_score ?? 0;
  const currentLevel = pred?.risk_level ?? scoreToLevel(currentScore);

  // If we have recent readings, compute trend acceleration
  let rainTrend = 0;
  let soilTrend = 0;
  let movementTrend = 0;

  if (recentReadings.length >= 2) {
    const recent = recentReadings.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const span = Math.max((last.timestamp - first.timestamp) / 1000, 1); // seconds
    rainTrend = ((last.rainfall - first.rainfall) / span) * 3600; // mm/h change rate
    soilTrend = (last.soilMoisture - first.soilMoisture) / span * 3600; // %/h change rate
    movementTrend = last.groundMovement;
  }

  // Factor contributions with weights
  const rainfallWeight = computeRainfallWeight(pred?.rainfall_24h ?? 0, rainTrend);
  const soilWeight = computeSoilWeight(pred?.soil_moisture ?? 0, soilTrend);
  const slopeWeight = computeSlopeWeight(pred?.slope_angle ?? 0);
  const movementWeight = computeMovementWeight(movementTrend, pred?.soil_moisture ?? 0);
  const historicalWeight = computeHistoricalWeight(location.historical_landslides);

  const totalWeight = rainfallWeight + soilWeight + slopeWeight + movementWeight + historicalWeight;

  const factors: FactorContribution[] = [
    {
      factor: 'Rainfall',
      weight: Math.round((rainfallWeight / totalWeight) * 100),
      value: `${(pred?.rainfall_24h ?? 0).toFixed(1)}mm/24h${rainTrend > 0 ? ` (+${rainTrend.toFixed(1)}mm/h trend)` : ''}`,
      direction: rainTrend > 0.5 ? 'up' : rainTrend < -0.5 ? 'down' : 'stable',
      contribution: labelContribution(rainfallWeight, totalWeight),
    },
    {
      factor: 'Soil Moisture',
      weight: Math.round((soilWeight / totalWeight) * 100),
      value: `${(pred?.soil_moisture ?? 0).toFixed(0)}% saturation${soilTrend > 0 ? ' (rising)' : ''}`,
      direction: soilTrend > 1 ? 'up' : soilTrend < -1 ? 'down' : 'stable',
      contribution: labelContribution(soilWeight, totalWeight),
    },
    {
      factor: 'Ground Movement',
      weight: Math.round((movementWeight / totalWeight) * 100),
      value: `${movementTrend.toFixed(2)}mm/day displacement`,
      direction: movementTrend > 1.5 ? 'up' : movementTrend > 0.3 ? 'stable' : 'down',
      contribution: labelContribution(movementWeight, totalWeight),
    },
    {
      factor: 'Slope Angle',
      weight: Math.round((slopeWeight / totalWeight) * 100),
      value: `${(pred?.slope_angle ?? 0).toFixed(0)}°`,
      direction: 'stable',
      contribution: labelContribution(slopeWeight, totalWeight),
    },
    {
      factor: 'Historical Risk',
      weight: Math.round((historicalWeight / totalWeight) * 100),
      value: `${location.historical_landslides} past events`,
      direction: 'stable',
      contribution: labelContribution(historicalWeight, totalWeight),
    },
  ].sort((a, b) => b.weight - a.weight);

  // Predicted future score: current + acceleration from trends
  const rainAcceleration = Math.max(0, rainTrend * 0.8);
  const soilAcceleration = Math.max(0, soilTrend * 0.5);
  const movementAcceleration = movementTrend > 1 ? (movementTrend - 1) * 3 : 0;
  const acceleration = rainAcceleration + soilAcceleration + movementAcceleration;

  let predictedScore = currentScore + acceleration;
  predictedScore = Math.min(Math.max(predictedScore, 0), 100);
  const predictedLevel = scoreToLevel(predictedScore);

  const trendDirection: PredictionResult['trendDirection'] =
    predictedScore > currentScore + 3 ? 'escalating' : predictedScore < currentScore - 3 ? 'decreasing' : 'stable';

  const probability = Math.min(
    100,
    Math.round(60 + acceleration * 2 + (currentScore > 50 ? 15 : 0)),
  );

  const confidence = Math.min(98, (pred?.confidence ?? 75) + Math.min(recentReadings.length * 2, 15));
  const timeframe = acceleration > 8 ? '1-3 hours' : acceleration > 4 ? '3-6 hours' : acceleration > 1 ? '6-12 hours' : '12-24 hours';

  // GenAI-style summary
  const summary = generateSummary(location, currentLevel, predictedLevel, trendDirection, factors, probability, timeframe);

  return {
    currentScore: Math.round(currentScore),
    currentLevel,
    predictedScore: Math.round(predictedScore),
    predictedLevel,
    trendDirection,
    probability,
    timeframe,
    factors,
    summary,
    confidence: Math.round(confidence),
  };
}

// ──────────────────────────────────────────────────────────
// Weight computation for each factor
// ──────────────────────────────────────────────────────────
function computeRainfallWeight(rainfall24h: number, rainTrend: number): number {
  let w = 0;
  if (rainfall24h > 100) w += 40;
  else if (rainfall24h > 70) w += 30;
  else if (rainfall24h > 40) w += 20;
  else if (rainfall24h > 20) w += 10;
  else w += 5;
  if (rainTrend > 2) w += 15;
  else if (rainTrend > 0.5) w += 8;
  return w;
}

function computeSoilWeight(soilMoisture: number, soilTrend: number): number {
  let w = 0;
  if (soilMoisture > 85) w += 35;
  else if (soilMoisture > 70) w += 25;
  else if (soilMoisture > 50) w += 15;
  else w += 5;
  if (soilTrend > 2) w += 12;
  else if (soilTrend > 0.5) w += 6;
  return w;
}

function computeSlopeWeight(slope: number): number {
  if (slope > 50) return 25;
  if (slope > 35) return 18;
  if (slope > 25) return 12;
  if (slope > 15) return 8;
  return 3;
}

function computeMovementWeight(movement: number, soilMoisture: number): number {
  let w = 0;
  if (movement > 2) w += 35;
  else if (movement > 1) w += 25;
  else if (movement > 0.5) w += 12;
  else w += 3;
  // Amplify if soil is saturated
  if (soilMoisture > 80) w += 10;
  return w;
}

function computeHistoricalWeight(events: number): number {
  if (events > 30) return 15;
  if (events > 15) return 10;
  if (events > 5) return 6;
  return 2;
}

function labelContribution(weight: number, total: number): FactorContribution['contribution'] {
  const pct = (weight / total) * 100;
  if (pct > 30) return 'Very High';
  if (pct > 20) return 'High';
  if (pct > 12) return 'Moderate';
  if (pct > 5) return 'Low';
  return 'Minimal';
}

// ──────────────────────────────────────────────────────────
// GenAI-style readable summary generation
// ──────────────────────────────────────────────────────────
function generateSummary(
  location: LocationWithRisk,
  currentLevel: RiskLevel,
  predictedLevel: RiskLevel,
  trend: PredictionResult['trendDirection'],
  factors: FactorContribution[],
  probability: number,
  timeframe: string,
): string {
  const topFactors = factors.slice(0, 3).map((f) => f.factor.toLowerCase());
  const levelChange = predictedLevel !== currentLevel;

  let summary = `The area ${location.name} is currently at ${currentLevel} risk`;

  if (trend === 'escalating') {
    summary += levelChange
      ? ` and is predicted to escalate to ${predictedLevel} risk within ${timeframe}.`
      : ` and conditions are worsening, with a ${probability}% probability of significant risk increase within ${timeframe}.`;
  } else if (trend === 'decreasing') {
    summary += ` but conditions are improving. Risk is expected to decrease within ${timeframe}.`;
  } else {
    summary += ` and is expected to remain stable within ${timeframe}.`;
  }

  summary += ` The primary contributing factors are ${topFactors.join(', ')}.`;

  if (predictedLevel === 'CRITICAL' || predictedLevel === 'HIGH') {
    summary += ` Authorities are advised to monitor the affected slope closely, restrict access to nearby roads, and prepare evacuation protocols.`;
  } else if (predictedLevel === 'MEDIUM') {
    summary += ` Continued monitoring is recommended with increased observation frequency.`;
  } else {
    summary += ` Routine monitoring is sufficient at this time.`;
  }

  return summary;
}

// ──────────────────────────────────────────────────────────
// Automated alert threshold engine
// ──────────────────────────────────────────────────────────
export interface AlertThreshold {
  level: RiskLevel;
  scoreMin: number;
  action: string;
  notifyAuthority: string;
}

export const ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    level: 'CRITICAL',
    scoreMin: 85,
    action: 'Emergency alert: Immediate evacuation, deploy NDRF/SDRF, close roads, activate shelters',
    notifyAuthority: 'District Collector · NDRF Command · State Emergency Operations Centre',
  },
  {
    level: 'HIGH',
    scoreMin: 70,
    action: 'Alert responsible authorities: Pre-position response teams, restrict non-essential access',
    notifyAuthority: 'Sub-Divisional Magistrate · SDRF · District Emergency Officer',
  },
  {
    level: 'MEDIUM',
    scoreMin: 50,
    action: 'Monitoring increased: 15-minute observation cycle, alert field teams',
    notifyAuthority: 'Block Development Officer · Field Monitoring Team',
  },
  {
    level: 'MODERATE',
    scoreMin: 30,
    action: 'Enhanced monitoring: 30-minute observation cycle',
    notifyAuthority: 'Local Monitoring Station',
  },
  {
    level: 'LOW',
    scoreMin: 0,
    action: 'Normal monitoring: Standard hourly observation',
    notifyAuthority: 'Local Monitoring Station',
  },
];

export function getThresholdForScore(score: number): AlertThreshold {
  return ALERT_THRESHOLDS.find((t) => score >= t.scoreMin) ?? ALERT_THRESHOLDS[ALERT_THRESHOLDS.length - 1];
}

export function shouldAutoAlert(
  prevScore: number,
  newScore: number,
): { shouldAlert: boolean; threshold: AlertThreshold | null } {
  const prevThreshold = getThresholdForScore(prevScore);
  const newThreshold = getThresholdForScore(newScore);
  // Alert when risk crosses up into HIGH or CRITICAL
  if (newScore > prevScore && (newThreshold.level === 'HIGH' || newThreshold.level === 'CRITICAL')) {
    if (prevThreshold.level !== newThreshold.level) {
      return { shouldAlert: true, threshold: newThreshold };
    }
  }
  return { shouldAlert: false, threshold: null };
}

// ──────────────────────────────────────────────────────────
// Automated report generation
// ──────────────────────────────────────────────────────────
export interface GeneratedReport {
  id: string;
  locationName: string;
  state: string;
  generatedAt: string;
  currentRiskLevel: RiskLevel;
  currentRiskScore: number;
  predictedRiskLevel: RiskLevel;
  predictedRiskScore: number;
  trendDirection: string;
  probability: number;
  timeframe: string;
  rainfall: number;
  soilMoisture: number;
  slopeAngle: number;
  groundMovement: number;
  contributingFactors: FactorContribution[];
  alertHistory: { severity: string; reason: string; time: string; status: string }[];
  recommendedActions: string[];
  summary: string;
  notifiedAuthorities: string;
}

export function generateReport(
  location: LocationWithRisk,
  prediction: PredictionResult,
  alerts: { severity: string; reason: string; created_at: string; status: string }[],
  groundMovement: number,
): GeneratedReport {
  const threshold = getThresholdForScore(prediction.predictedScore);
  const locAlerts = alerts.filter((a) => a.reason.includes(location.name));

  return {
    id: `rpt-${Date.now()}`,
    locationName: location.name,
    state: location.state,
    generatedAt: new Date().toISOString(),
    currentRiskLevel: prediction.currentLevel,
    currentRiskScore: prediction.currentScore,
    predictedRiskLevel: prediction.predictedLevel,
    predictedRiskScore: prediction.predictedScore,
    trendDirection: prediction.trendDirection,
    probability: prediction.probability,
    timeframe: prediction.timeframe,
    rainfall: location.latest_prediction?.rainfall_24h ?? 0,
    soilMoisture: location.latest_prediction?.soil_moisture ?? 0,
    slopeAngle: location.latest_prediction?.slope_angle ?? 0,
    groundMovement,
    contributingFactors: prediction.factors,
    alertHistory: locAlerts.map((a) => ({
      severity: a.severity,
      reason: a.reason,
      time: a.created_at,
      status: a.status,
    })),
    recommendedActions: threshold.action.split(': ').slice(-1)[0].split(', ').slice(0, 5),
    summary: prediction.summary,
    notifiedAuthorities: threshold.notifyAuthority,
  };
}
