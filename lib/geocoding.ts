const defaultGeocodingBaseUrl = "https://nominatim.openstreetmap.org";

export type GeocodingResult = {
  id: string;
  name: string;
  subtitle: string;
  label: string;
  latitude: number;
  longitude: number;
};

function getGeocodingBaseUrl() {
  return (process.env.NOMINATIM_BASE_URL || defaultGeocodingBaseUrl).replace(/\/$/, "");
}

function getGeocodingHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": process.env.LOCATION_SEARCH_USER_AGENT || "SafeSignal/1.0",
  };
}

function firstAddressValue(address: Record<string, string>, keys: string[]) {
  return keys.map((key) => address[key]).find(Boolean) || "";
}

function formatResult(result: {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
}): GeocodingResult | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const address = result.address || {};
  const name =
    result.name ||
    firstAddressValue(address, ["amenity", "building", "road", "neighbourhood", "suburb"]) ||
    result.display_name?.split(",")[0] ||
    "Selected location";
  const area = firstAddressValue(address, ["neighbourhood", "suburb", "city_district", "town", "city", "village"]);
  const state = address.state || address.state_district || "";
  const country = address.country || "";
  const subtitle = [area, state, country]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => value.toLowerCase() !== name.toLowerCase())
    .join(", ");

  return {
    id: `${result.osm_type || "place"}-${result.osm_id || result.place_id || `${latitude}-${longitude}`}`,
    name,
    subtitle,
    label: subtitle ? `${name}, ${subtitle}` : name,
    latitude,
    longitude,
  };
}

export async function searchLocations(query: string) {
  const url = new URL(`${getGeocodingBaseUrl()}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");

  const configuredCountryCodes = process.env.NOMINATIM_COUNTRY_CODES?.trim();
  if (configuredCountryCodes) {
    url.searchParams.set("countrycodes", configuredCountryCodes);
  }

  const response = await fetch(url, {
    headers: getGeocodingHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Geocoding search failed with status ${response.status}.`);
  }

  const results = (await response.json()) as Array<Parameters<typeof formatResult>[0]>;
  return results.map(formatResult).filter((result): result is GeocodingResult => result !== null);
}

export async function reverseGeocode(latitude: number, longitude: number) {
  const url = new URL(`${getGeocodingBaseUrl()}/reverse`);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: getGeocodingHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}.`);
  }

  return formatResult((await response.json()) as Parameters<typeof formatResult>[0]);
}
