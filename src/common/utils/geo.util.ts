export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface VenueBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function isInsideBounds(
  lat: number,
  lng: number,
  bounds: VenueBounds,
): boolean {
  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  );
}

export interface VenueEntryPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export function computeEntryPoints(bounds: VenueBounds): VenueEntryPoint[] {
  const midLat = (bounds.north + bounds.south) / 2;
  const midLng = (bounds.east + bounds.west) / 2;
  return [
    { id: 'north', name: 'North entrance', lat: bounds.north, lng: midLng },
    { id: 'south', name: 'South entrance', lat: bounds.south, lng: midLng },
    { id: 'east', name: 'East entrance', lat: midLat, lng: bounds.east },
    { id: 'west', name: 'West entrance', lat: midLat, lng: bounds.west },
  ];
}

export function snapToNearestBoundary(
  lat: number,
  lng: number,
  bounds: VenueBounds,
): { lat: number; lng: number; snapped: boolean } {
  if (isInsideBounds(lat, lng, bounds)) {
    return { lat, lng, snapped: false };
  }

  const candidates = [
    { lat: bounds.north, lng: clamp(lng, bounds.west, bounds.east) },
    { lat: bounds.south, lng: clamp(lng, bounds.west, bounds.east) },
    { lat: clamp(lat, bounds.south, bounds.north), lng: bounds.east },
    { lat: clamp(lat, bounds.south, bounds.north), lng: bounds.west },
  ];

  let nearest = candidates[0];
  let nearestDistance = haversineDistanceMeters(
    lat,
    lng,
    nearest.lat,
    nearest.lng,
  );

  for (const point of candidates.slice(1)) {
    const distance = haversineDistanceMeters(lat, lng, point.lat, point.lng);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return { ...nearest, snapped: true };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function bearingDegrees(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(toLng - fromLng);
  const y = Math.sin(dLng) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function cardinalDirection(bearing: number): string {
  const directions = [
    'north',
    'northeast',
    'east',
    'southeast',
    'south',
    'southwest',
    'west',
    'northwest',
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

export function generateRoutePoints(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  steps = 5,
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      lat: fromLat + (toLat - fromLat) * t,
      lng: fromLng + (toLng - fromLng) * t,
    });
  }
  return points;
}

export function generateTurnByTurnSteps(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  vendorName: string,
  boothNumber?: string | null,
): Array<{ instruction: string; distance: number; duration: number }> {
  const walkingSpeedMps = 1.4;
  const totalDistance = haversineDistanceMeters(fromLat, fromLng, toLat, toLng);
  const totalDuration = Math.round(totalDistance / walkingSpeedMps);
  const boothLabel = boothNumber ? `booth ${boothNumber}` : 'the booth';

  if (totalDistance < 25) {
    return [
      {
        instruction: `You are near ${vendorName}. Walk to ${boothLabel}.`,
        distance: Math.round(totalDistance),
        duration: totalDuration,
      },
      {
        instruction: `Arrive at ${vendorName} (${boothLabel})`,
        distance: 0,
        duration: 0,
      },
    ];
  }

  const bearing = bearingDegrees(fromLat, fromLng, toLat, toLng);
  const direction = cardinalDirection(bearing);
  const segmentCount = Math.min(3, Math.max(1, Math.floor(totalDistance / 50)));
  const segmentDistance = totalDistance / (segmentCount + 1);
  const steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }> = [];

  for (let i = 0; i < segmentCount; i++) {
    const segDist = Math.round(segmentDistance);
    const segDur = Math.round(segDist / walkingSpeedMps);
    steps.push({
      instruction:
        i === 0
          ? `Head ${direction} toward ${vendorName}`
          : `Continue toward ${vendorName}`,
      distance: segDist,
      duration: segDur,
    });
  }

  const usedDistance = steps.reduce((sum, step) => sum + step.distance, 0);
  const finalDistance = Math.max(0, Math.round(totalDistance - usedDistance));

  steps.push({
    instruction: `Arrive at ${vendorName} (${boothLabel})`,
    distance: finalDistance,
    duration: Math.round(finalDistance / walkingSpeedMps),
  });

  return steps;
}

export function parseNearParam(
  near?: string,
): { lat: number; lng: number } | null {
  if (!near) return null;
  const parts = near.split(',').map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return { lat: parts[0], lng: parts[1] };
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 10000) / 10000;
}
