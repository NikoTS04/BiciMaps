declare module 'togeojson' {
  export function kml(doc: Document, options?: any): GeoJSON.FeatureCollection;
  export function gpx(doc: Document, options?: any): GeoJSON.FeatureCollection;
}
