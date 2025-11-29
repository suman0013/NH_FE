import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { scaleSequential } from "d3-scale";
import { interpolateBlues } from "d3-scale-chromatic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQueryFn } from "@/lib/queryClient";
import { Map as MapIcon, ZoomIn, ZoomOut, RotateCcw, Globe, MapPin, ArrowRight, X } from "lucide-react";
import { Link } from "wouter";
import L from "leaflet";
import namahattaLogo from "@assets/namhatta_logo_1757690747029.png";

// Geographic boundaries for different zoom levels
const ZOOM_LEVELS = {
  COUNTRY: { scale: 800, center: [77, 20] as [number, number] }, // India-centered
  STATE: { scale: 1600, center: [88, 22] as [number, number] }, // West Bengal-centered  
  DISTRICT: { scale: 3200, center: [88.4, 22.9] as [number, number] }, // Kolkata area
  SUB_DISTRICT: { scale: 6400, center: [88.4, 22.9] as [number, number] }
};

type MapLevel = 'COUNTRY' | 'STATE' | 'DISTRICT' | 'SUB_DISTRICT' | 'VILLAGE';

interface MapData {
  name: string;
  count: number;
  coordinates?: [number, number];
  level: MapLevel;
}

export default function Map() {
  const [currentLevel, setCurrentLevel] = useState<MapLevel>('COUNTRY');
  const [zoomLevel, setZoomLevel] = useState<number>(3);
  const [showNamahattaList, setShowNamahattaList] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapData | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Determine level based on zoom - custom zoom requirements as requested
  const getLevelFromZoom = (zoom: number): MapLevel => {
    if (zoom >= 12) return 'VILLAGE';
    if (zoom >= 10) return 'SUB_DISTRICT';
    if (zoom >= 8) return 'DISTRICT';
    if (zoom >= 5) return 'STATE';
    return 'COUNTRY';
  };

  // Update level when zoom changes
  useEffect(() => {
    const newLevel = getLevelFromZoom(zoomLevel);
    if (newLevel !== currentLevel) {
      console.log(`Zoom level ${zoomLevel} -> switching from ${currentLevel} to ${newLevel} view`);
      setCurrentLevel(newLevel);
    }
  }, [zoomLevel, currentLevel]);

  // Always load all data - no conditional loading to avoid blank screens
  const { data: countryData = [], isLoading: countryLoading } = useQuery({
    queryKey: ["/api/map/countries"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stateData = [], isLoading: stateLoading } = useQuery({
    queryKey: ["/api/map/states"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: districtData = [], isLoading: districtLoading } = useQuery({
    queryKey: ["/api/map/districts"], 
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: subDistrictData = [], isLoading: subDistrictLoading } = useQuery({
    queryKey: ["/api/map/sub-districts"], 
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: villageData = [], isLoading: villageLoading } = useQuery({
    queryKey: ["/api/map/villages"], 
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });

  // Query for namahattas in selected location
  const { data: locationNamahattas, isLoading: namahattasLoading } = useQuery({
    queryKey: ["/api/namahattas", selectedLocation?.level, selectedLocation?.name],
    queryFn: async () => {
      if (!selectedLocation) return { data: [], total: 0 };
      const queryParams = buildLocationQuery(selectedLocation);
      const response = await fetch(`/api/namahattas${queryParams}`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch namahattas');
      return response.json();
    },
    enabled: !!selectedLocation,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = countryLoading || stateLoading || districtLoading || subDistrictLoading || villageLoading;

  // Get current data based on level
  const getCurrentData = (): MapData[] => {
    const coordinatesMap: Record<string, [number, number]> = {
      // Countries
      'India': [77, 20],
      'Bangladesh': [90, 24],
      'Sri Lanka': [81, 7],
      'Nepal': [84, 28],
      
      // States
      'West Bengal': [88, 22.5],
      'Odisha': [85, 20],
      'Bihar': [85, 25.5],
      'Jharkhand': [85.5, 23.5],
      'Assam': [94, 26.5],
      'Dhaka': [90.4, 23.8],
      'Chittagong Division': [91.8, 22.3],
      'Western': [79.8, 6.9],
      'Bagmati': [85.3, 27.7],
      
      // Districts - West Bengal
      'Nadia': [88.4, 23.4],
      'Kolkata': [88.4, 22.6],
      'Howrah': [88.3, 22.6],
      'Paschim Bardhaman': [87.3, 23.2],
      'Darjeeling': [88.3, 27.0],
      'Malda': [88.0, 25.0],
      'Cooch Behar': [89.4, 26.3],
      'Jalpaiguri': [88.7, 26.5],
      'Murshidabad': [88.2, 24.2],
      'Bankura': [87.1, 23.2],
      'Purulia': [86.4, 23.3],
      'Paschim Medinipur': [87.3, 22.4],
      'Purba Medinipur': [87.8, 22.3],
      'North 24 Parganas': [88.6, 22.8],
      
      // Districts - Odisha
      'Khordha': [85.8, 20.2],
      'Puri': [85.8, 19.8],
      'Cuttack': [85.9, 20.5],
      'Ganjam': [84.8, 19.4],
      'Sundargarh': [84.0, 22.1],
      'Sambalpur': [83.9, 21.5],
      'Balasore': [86.9, 21.5],
      'Mayurbhanj': [86.7, 22.1],
      'Jharsuguda': [84.0, 21.9],
      'Angul': [85.1, 20.8],
      'Kendrapara': [86.4, 20.5],
      'Koraput': [82.7, 18.8],
      
      // Districts - Bihar
      'Patna': [85.1, 25.6],
      'Gaya': [85.0, 24.8],
      'Muzaffarpur': [85.4, 26.1],
      'Bhagalpur': [87.0, 25.2],
      'Darbhanga': [85.9, 26.2],
      'Purnia': [87.5, 25.8],
      'Bhojpur': [84.4, 25.5],
      'Begusarai': [86.1, 25.4],
      'Katihar': [87.6, 25.5],
      'Rohtas': [84.0, 24.9],
      
      // Districts - Jharkhand
      'Ranchi': [85.3, 23.4],
      'East Singhbhum': [86.2, 22.8],
      'Dhanbad': [86.4, 23.8],
      'Bokaro': [86.0, 23.8],
      'Deoghar': [86.7, 24.5],
      'Hazaribagh': [85.4, 24.0],
      'Giridih': [86.3, 24.2],
      'West Singhbhum': [85.8, 22.6],
      
      // Districts - Assam
      'Kamrup Metropolitan': [91.7, 26.2],
      'Dibrugarh': [95.0, 27.5],
      'Cachar': [92.8, 24.8],
      'Jorhat': [94.2, 26.8],
      'Sonitpur': [92.8, 26.6],
      'Nagaon': [92.7, 26.3],
      'Tinsukia': [95.4, 27.5],
      'Bongaigaon': [90.5, 26.5],
      
      // Other countries/regions
      'Dhaka Metro': [90.4, 23.8],
      'Chittagong Metro': [91.8, 22.3],
      'Colombo': [79.8, 6.9],
      'Kathmandu': [85.3, 27.7],
      
      // Sub-districts - expanded coverage
      'Mayapur': [88.4, 23.4],
      'Central': [88.35, 22.57],
      'Krishnanagar': [88.5, 23.4],
      'North': [88.37, 22.62],
      'Dhanmondi': [90.37, 23.75],
      'Port Area': [91.8, 22.3],
      'Colombo Central': [79.8, 6.9],
      'Dantan - II': [87.2, 22.3],
      'Bongaon': [88.8, 23.0],
      'Barasat - I': [88.5, 22.7],
      'Matigara': [88.4, 26.8],
      'Simlapal': [86.9, 23.1],
      'Rajarhat': [88.5, 22.7],
      'Sarenga': [87.3, 22.7],
      'Kolkata Sadar': [88.36, 22.57],
      'Salt Lake': [88.4, 22.6],
      'Dum Dum': [88.4, 22.6],
      'Barrackpore': [88.4, 22.8],
      'Basirhat': [89.0, 22.7],
      'Deganga': [88.7, 22.8],
      'Habra': [88.6, 22.8],
      'Haroa': [88.9, 22.6],
      'Minakhan': [88.9, 22.5],
      'Sandeshkhali': [88.9, 22.5],
      'Swarupnagar': [88.9, 22.9],
      'Bankura - II': [87.1, 23.2],
      'Khatra': [86.9, 23.1],
      'Onda': [87.2, 23.1],
      'Raipur': [87.0, 23.0],
      
      // Villages - comprehensive mapping
      'Agabar Chak': [87.2, 22.3],
      'Akaipur': [88.8, 23.0],
      'Bairatisal (Ct)': [88.4, 26.8],
      'Bankata': [86.9, 23.1],
      'Ahira': [88.5, 22.7],
      'Thakdari': [88.5, 22.7],
      'Andharia': [87.1, 23.2],
      'Bankhola': [87.1, 23.1],
      'Baradhara': [87.0, 23.2],
      'Baranimdi': [87.2, 23.1],
      'Saltlake City': [88.4, 22.6],
      'New Town': [88.5, 22.6],
      'Action Area': [88.5, 22.6],
      'Sector V': [88.4, 22.6],
      'Park Street': [88.35, 22.56],
      'Chowringhee': [88.35, 22.55],
      'Esplanade': [88.35, 22.57],
      'Sealdah': [88.37, 22.58],
      'Shyambazar': [88.37, 22.59]
    };

    switch (currentLevel) {
      case 'COUNTRY':
        const countries = Array.isArray(countryData) ? countryData.map((item: any) => ({
          name: item.country,
          count: item.count,
          coordinates: coordinatesMap[item.country],
          level: 'COUNTRY' as MapLevel
        })).filter((item: any) => item.coordinates) : [];
        console.log(`Showing ${countries.length} countries at zoom ${zoomLevel}`);
        return countries;
      case 'STATE':
        const states = Array.isArray(stateData) ? stateData.map((item: any) => ({
          name: item.state,
          count: item.count,
          coordinates: coordinatesMap[item.state],
          level: 'STATE' as MapLevel
        })).filter((item: any) => item.coordinates) : [];
        console.log(`Showing ${states.length} states at zoom ${zoomLevel}`);
        return states;
      case 'DISTRICT':
        const districts = Array.isArray(districtData) ? districtData.map((item: any) => ({
          name: item.district,
          count: item.count,
          coordinates: coordinatesMap[item.district],
          level: 'DISTRICT' as MapLevel
        })).filter((item: any) => item.coordinates) : [];
        console.log(`Showing ${districts.length} districts at zoom ${zoomLevel}`);
        return districts;
      case 'SUB_DISTRICT':
        const subDistricts = Array.isArray(subDistrictData) ? subDistrictData.map((item: any) => {
          let coordinates = coordinatesMap[item.subDistrict];
          
          // Fallback coordinate generation for missing sub-districts
          if (!coordinates && item.district) {
            const districtCoords = coordinatesMap[item.district];
            if (districtCoords) {
              // Generate approximate coordinates near the district center
              const [lng, lat] = districtCoords;
              coordinates = [
                lng + (Math.random() - 0.5) * 0.1, // ±0.05 degree variation
                lat + (Math.random() - 0.5) * 0.1
              ];
              console.log(`Generated fallback coordinates for ${item.subDistrict}: [${coordinates[1]}, ${coordinates[0]}]`);
            }
          }
          
          return {
            name: item.subDistrict,
            count: item.count,
            coordinates: coordinates,
            level: 'SUB_DISTRICT' as MapLevel
          };
        }).filter((item: any) => item.coordinates) : [];
        
        console.log(`Showing ${subDistricts.length} sub-districts at zoom ${zoomLevel}`);
        if (subDistricts.length === 0) {
          console.log('No sub-districts found with coordinates from:', subDistrictData);
        }
        return subDistricts;
      case 'VILLAGE':
        const villages = Array.isArray(villageData) ? villageData.map((item: any) => {
          let coordinates = coordinatesMap[item.village];
          
          // Fallback coordinate generation for missing villages
          if (!coordinates) {
            // Try to use sub-district coordinates as fallback
            const subDistrictCoords = coordinatesMap[item.subDistrict];
            if (subDistrictCoords) {
              const [lng, lat] = subDistrictCoords;
              coordinates = [
                lng + (Math.random() - 0.5) * 0.05, // ±0.025 degree variation
                lat + (Math.random() - 0.5) * 0.05
              ];
              console.log(`Generated fallback coordinates for ${item.village}: [${coordinates[1]}, ${coordinates[0]}]`);
            }
          }
          
          return {
            name: item.village,
            count: item.count,
            coordinates: coordinates,
            level: 'VILLAGE' as MapLevel
          };
        }).filter((item: any) => item.coordinates) : [];
        
        console.log(`Showing ${villages.length} villages at zoom ${zoomLevel}`);
        if (villages.length === 0) {
          console.log('No villages found with coordinates from:', villageData);
        }
        return villages;
      default:
        return [];
    }
  };

  const currentData = getCurrentData();
  const maxCount = Math.max(...currentData.map(d => d.count), 1);
  const colorScale = scaleSequential(interpolateBlues).domain([0, maxCount]);

  // Initialize Leaflet map
  useEffect(() => {
    const initMap = () => {
      const mapContainer = document.getElementById('leaflet-map');
      if (!mapContainer) {
        console.log('Map container not found, retrying...');
        setTimeout(initMap, 100);
        return;
      }
      
      if (mapRef.current) {
        return; // Map already initialized
      }

      try {
        // Initialize the map with full interaction capabilities
        const map = L.map('leaflet-map', {
          zoomControl: true, // Enable zoom controls
          doubleClickZoom: true, // Enable double click zoom
          scrollWheelZoom: true, // Enable mouse wheel zoom
          touchZoom: true, // Enable touch zoom on mobile
          dragging: true, // Enable dragging
          boxZoom: true, // Enable box zoom with shift+drag
          attributionControl: false, // Disable attribution control
        }).setView([20, 77], 3); // Centered on South Asia at country level
        
        // Listen for zoom changes to update level automatically
        map.on('zoomend', () => {
          const zoom = map.getZoom();
          console.log('Zoom changed to:', zoom);
          setZoomLevel(Math.round(zoom));
        });
        
        // Listen for view changes to ensure markers are always visible
        map.on('moveend', () => {
          console.log('Map moved, current bounds:', map.getBounds());
        });
        
        // Set initial zoom level
        setZoomLevel(4);
        
        // Add OpenStreetMap tiles with better error handling
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '',
          maxZoom: 19,
          minZoom: 2,
          detectRetina: true,
          crossOrigin: true
        });
        
        // Remove the problematic error handler for now
        // tileLayer.on('tileerror', (e: L.LeafletEvent) => {
        //   console.log('Tile error:', e);
        // });
        
        tileLayer.addTo(map);
        
        // Initialize marker layer
        markersRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        
        console.log('Leaflet map initialized successfully');
      } catch (error) {
        console.error('Error initializing map:', error);
        setTimeout(initMap, 500);
      }
    };

    // Start initialization
    initMap();
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) {
      console.log('Map or markers not ready yet');
      return;
    }
    
    console.log(`Updating markers for ${currentLevel} with ${currentData.length} items:`, currentData);
    
    // Clear existing markers
    markersRef.current.clearLayers();
    
    if (currentData.length === 0) {
      console.log('No data to display on map for level:', currentLevel);
      // Don't return early - let the map stay visible even without markers
    }
    
    // Add new markers - only if we have data
    if (currentData.length > 0) {
      currentData.forEach((data, index) => {
        if (!data.coordinates || !markersRef.current) {
          console.log('Missing coordinates for:', data.name);
          return;
        }
        
        const [lng, lat] = data.coordinates;
        
        console.log(`Adding marker for ${data.name} at [${lat}, ${lng}] with ${data.count} namahattas`);
        
        // Create a combined marker with visible count
        const markerSize = Math.max(40, Math.sqrt(data.count) * 15);
        const combinedIcon = L.divIcon({
          html: `
            <div style="
              background-image: url('${namahattaLogo}');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              color: white;
              border: 3px solid white;
              border-radius: 50%;
              width: ${markerSize}px;
              height: ${markerSize}px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              cursor: pointer;
              font-size: ${Math.max(12, markerSize * 0.3)}px;
              line-height: 1;
              z-index: 1000;
              position: relative;
            ">
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.3);
                border-radius: 50%;
                z-index: 1;
              "></div>
              <div style="font-size: ${Math.max(18, markerSize * 0.4)}px; margin-bottom: 2px; position: relative; z-index: 2; color: white;">${data.count}</div>
              <div style="font-size: ${Math.max(10, markerSize * 0.25)}px; opacity: 0.9; position: relative; z-index: 2; color: white;">${data.name.length > 8 ? data.name.substring(0, 8) + '...' : data.name}</div>
            </div>
          `,
          className: 'namahatta-marker',
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2]
        });
        
        const marker = L.marker([lat, lng], { icon: combinedIcon });
        
        // Add popup
        marker.bindPopup(`
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: #1f2937;">${data.name}</h3>
            <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
              <strong style="color: #374151;">Namahattas:</strong> 
              <span style="font-weight: 600; color: #059669;">${data.count}</span>
            </p>
            <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">
              Level: ${currentLevel.replace('_', ' ')}
            </p>
            <p style="margin: 8px 0 0 0; color: #6366f1; font-size: 12px; cursor: pointer;">
              Click to view namahattas →
            </p>
          </div>
        `);
        
        marker.on('click', () => {
          console.log('Marker clicked:', data.name);
          handleMarkerClick(data);
        });
        
        markersRef.current.addLayer(marker);
      });
    }
    
    console.log(`Added ${currentData.length} markers to map`);
  }, [currentData, colorScale, currentLevel]);



  const handleReset = () => {
    if (mapRef.current) {
      mapRef.current.setView([20, 77], 4);
    }
  };



  const handleMarkerClick = (data: MapData) => {
    console.log('Marker clicked:', data.name, 'Level:', data.level, 'Count:', data.count);
    
    // Always show namahatta list when clicking on markers
    console.log('Showing namahatta list for:', data.name);
    setSelectedLocation(data);
    
    // Calculate panel position based on marker coordinates
    if (mapRef.current && data.coordinates) {
      const [lng, lat] = data.coordinates;
      const point = mapRef.current.latLngToContainerPoint([lat, lng]);
      
      // Get map container dimensions
      const mapContainer = document.getElementById('leaflet-map');
      if (mapContainer) {
        const containerRect = mapContainer.getBoundingClientRect();
        
        // Panel dimensions (approximate)
        const panelWidth = 320; // 80 * 4 (w-80 = 320px)
        const panelHeight = 400; // approximate max height
        
        // Calculate position with boundary checks
        let x = point.x + 20; // 20px offset from marker
        let y = point.y - panelHeight / 2; // Center vertically on marker
        
        // Keep panel within map bounds
        if (x + panelWidth > containerRect.width) {
          x = point.x - panelWidth - 20; // Show on left side
        }
        if (y < 0) {
          y = 10; // Top margin
        }
        if (y + panelHeight > containerRect.height) {
          y = containerRect.height - panelHeight - 10; // Bottom margin
        }
        
        setPanelPosition({ x, y });
      }
    }
    
    setShowNamahattaList(true);
  };

  // Build query params for namahatta API based on location level
  const buildLocationQuery = (location: MapData) => {
    const params = new URLSearchParams();
    params.append('size', '50'); // Get up to 50 namahattas
    
    switch (location.level) {
      case 'COUNTRY':
        params.append('country', location.name);
        break;
      case 'STATE':
        params.append('state', location.name);
        break;
      case 'DISTRICT':
        params.append('district', location.name);
        break;
      case 'SUB_DISTRICT':
        params.append('subDistrict', location.name);
        break;
      case 'VILLAGE':
        params.append('village', location.name);
        break;
    }
    
    return `?${params.toString()}`;
  };


  if (isLoading) {
    return <MapSkeleton />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Namahatta Distribution Map</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset View
          </Button>
          <p className="text-sm text-muted-foreground">
            Zoom in/out to see different levels automatically
          </p>
        </div>
      </div>

      {/* Full Width Map */}
      <Card className="relative">
        <CardContent className="p-0">
          <div 
            id="leaflet-map" 
            className="w-full h-[68vh] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
            style={{ minHeight: '68vh' }}
          />
          
          {/* Embedded Namahatta List Panel */}
          {showNamahattaList && selectedLocation && panelPosition && (
            <div 
              className="absolute w-80 max-h-[60vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[1000]"
              style={{
                left: `${panelPosition.x}px`,
                top: `${panelPosition.y}px`,
                transform: 'translate(0, 0)'
              }}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {selectedLocation.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {selectedLocation.count} total
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setShowNamahattaList(false);
                      setPanelPosition(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[50vh] p-2">
                {namahattasLoading ? (
                  <div className="space-y-2 p-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : locationNamahattas && (locationNamahattas as any).data.length > 0 ? (
                  <div className="space-y-2">
                    {(locationNamahattas as any).data.map((namahatta: any) => (
                      <Link
                        key={namahatta.id}
                        href={`/namahattas/${namahatta.id}`}
                        onClick={() => setShowNamahattaList(false)}
                      >
                        <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer group border border-gray-100 dark:border-gray-600">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {namahatta.name}
                              </h4>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {[
                                  namahatta.address?.village,
                                  namahatta.address?.subDistrict,
                                  namahatta.address?.district,
                                  namahatta.address?.state
                                ].filter(Boolean).join(", ")}
                              </div>
                              {namahatta.status && (
                                <Badge 
                                  variant={namahatta.status === 'APPROVED' ? 'default' : 'secondary'}
                                  className="mt-1 text-xs h-5"
                                >
                                  {namahatta.status}
                                </Badge>
                              )}
                            </div>
                            <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-0.5" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No namahattas found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Namahattas</p>
                <p className="text-2xl font-bold">{currentData.reduce((sum, d) => sum + d.count, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Regions</p>
                <p className="text-2xl font-bold">{currentData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Current View</p>
                <p className="text-2xl font-bold">{currentLevel.replace('_', ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="lg:col-span-3 h-[600px]" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}