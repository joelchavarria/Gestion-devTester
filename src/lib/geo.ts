export type GeoPoint = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;

export function isValidGeoPoint(point: GeoPoint) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}

export function haversineDistanceM(a: GeoPoint, b: GeoPoint) {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function distanceToSegmentM(point: GeoPoint, start: GeoPoint, end: GeoPoint) {
  const latitudeScale = (Math.PI / 180) * EARTH_RADIUS_M;
  const longitudeScale = Math.cos((point.lat * Math.PI) / 180) * latitudeScale;
  const x = (point.lng - start.lng) * longitudeScale;
  const y = (point.lat - start.lat) * latitudeScale;
  const dx = (end.lng - start.lng) * longitudeScale;
  const dy = (end.lat - start.lat) * latitudeScale;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (x * dx + y * dy) / lengthSquared));
  const closest = {
    lat: start.lat + (end.lat - start.lat) * projection,
    lng: start.lng + (end.lng - start.lng) * projection,
  };
  return haversineDistanceM(point, closest);
}

export function distanceToPolylineM(point: GeoPoint, path: GeoPoint[]) {
  if (!path.length) return null;
  if (path.length === 1) return haversineDistanceM(point, path[0]);
  return path.slice(1).reduce((minimum, end, index) => Math.min(minimum, distanceToSegmentM(point, path[index], end)), Number.POSITIVE_INFINITY);
}

export function decodeGooglePolyline(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }

  return points;
}
