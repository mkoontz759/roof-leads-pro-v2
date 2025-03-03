'use client'

import { useState } from 'react'
import Map, { Marker, Popup } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const properties = [
  {
    id: 1,
    lat: 40.7128,
    lng: -74.0060,
    title: "New York Property",
    price: "$850,000",
    status: "For Sale"
  },
  {
    id: 2,
    lat: 40.7282,
    lng: -73.7949,
    title: "Queens Property",
    price: "$650,000",
    status: "For Sale"
  },
  // Add more properties as needed
]

export default function MapView() {
  const [popupInfo, setPopupInfo] = useState<(typeof properties)[0] | null>(null)

  return (
    <div className="h-[calc(100vh-10rem)] w-full rounded-lg border overflow-hidden">
      <Map
        mapboxAccessToken="pk.eyJ1IjoibWtvb250ejc1OSIsImEiOiJjbTRtM3JtdHAwOThsMmpxOG11YTlnZ2E3In0.7uLlBjYnBbdPrEXKxfCA4w"
        initialViewState={{
          longitude: -74.0060,
          latitude: 40.7128,
          zoom: 11
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {properties.map((property) => (
          <Marker
            key={property.id}
            longitude={property.lng}
            latitude={property.lat}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation()
              setPopupInfo(property)
            }}
          >
            <div className="cursor-pointer text-primary">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          </Marker>
        ))}

        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            onClose={() => setPopupInfo(null)}
          >
            <div className="p-2">
              <h3 className="font-semibold">{popupInfo.title}</h3>
              <p className="text-sm text-muted-foreground">{popupInfo.price}</p>
              <p className="text-sm text-muted-foreground">{popupInfo.status}</p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}

