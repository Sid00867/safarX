import math
import pandas as pd
import numpy as np
import requests
from typing import Tuple, Optional, Dict, Any


class LocationSafetyCalculator:
    """
    A class to calculate location safety scores based on multiple factors:
    - Cell tower density (remoteness)
    - Accessibility to essential services
    - Environmental hazards
    - Geofenced area status
    """
    
    def __init__(self, cell_tower_csv_path: str = './cell tower coverage/404.csv'):
        """
        Initialize the calculator with cell tower data.
        
        Args:
            cell_tower_csv_path: Path to the CSV file containing cell tower data
        """
        self.cell_tower_csv_path = cell_tower_csv_path
        self._load_cell_tower_data()
        
    def _load_cell_tower_data(self):
        """Load cell tower data from CSV file."""
        try:
            self.cell_towers_df = pd.read_csv(self.cell_tower_csv_path)
        except FileNotFoundError:
            print(f"Warning: Cell tower CSV not found at {self.cell_tower_csv_path}")
            self.cell_towers_df = pd.DataFrame(columns=['lat', 'long'])
        except Exception as e:
            print(f"Error loading cell tower data: {e}")
            self.cell_towers_df = pd.DataFrame(columns=['lat', 'long'])
    
    def calculate_safety_score(self, lat: float, lon: float, is_area_geofenced: bool = False) -> Tuple[float, str]:
        """
        Calculate the overall safety score for a given location.
        
        Args:
            lat: Latitude of the location
            lon: Longitude of the location
            is_area_geofenced: Whether the area is geofenced (True/False)
            
        Returns:
            Tuple of (safety_score, risk_level)
            - safety_score: 0-100 (100 = safest)
            - risk_level: 'low', 'med', or 'high'
        """
        # Calculate individual scores
        remoteness_score = self._calculate_remoteness_score(lat, lon)
        accessibility_score = self._calculate_accessibility_score(lat, lon)
        env_hazard_score = self._get_environmental_hazard_score(lat, lon)
        geofence_score = 1.0 if is_area_geofenced else 0.0
        
        # Weights for each component (sum to 1.0)
        w_remoteness = 0.2
        w_accessibility = 0.2
        w_environment = 0.2
        w_geofence = 0.4
        
        # Compute weighted score
        weighted_score = round(
            w_remoteness * (remoteness_score or 0.0) +
            w_accessibility * (accessibility_score or 0.0) +
            w_environment * (env_hazard_score or 0.0) +
            w_geofence * geofence_score,
            2
        )
        
        # Convert to safety score (0-100, higher is safer)
        safety_score = (1 - weighted_score) * 100
        
        # Determine risk level
        if safety_score >= 80:
            risk_level = 'low'
        elif safety_score >= 40:
            risk_level = 'med'
        else:
            risk_level = 'high'
        
        return safety_score, risk_level
    
    def get_detailed_scores(self, lat: float, lon: float, is_area_geofenced: bool = False) -> Dict[str, Any]:
        """
        Get detailed breakdown of all component scores.
        
        Args:
            lat: Latitude of the location
            lon: Longitude of the location
            is_area_geofenced: Whether the area is geofenced
            
        Returns:
            Dictionary with all component scores and final results
        """
        remoteness_score = self._calculate_remoteness_score(lat, lon)
        accessibility_score = self._calculate_accessibility_score(lat, lon)
        env_hazard_score = self._get_environmental_hazard_score(lat, lon)
        geofence_score = 1.0 if is_area_geofenced else 0.0
        
        safety_score, risk_level = self.calculate_safety_score(lat, lon, is_area_geofenced)
        
        return {
            'remoteness_score': remoteness_score,
            'accessibility_score': accessibility_score,
            'environmental_hazard_score': env_hazard_score,
            'geofence_score': geofence_score,
            'final_safety_score': safety_score,
            'risk_level': risk_level
        }
    
    def _compute_haversine_distances(self, lat_arr, lon_arr, ref_lat, ref_lon):
        """Calculate Haversine distances between points."""
        lat_arr = np.asarray(lat_arr)
        lon_arr = np.asarray(lon_arr)
        
        # Earth radius in km
        R = 6371.0
        
        phi1 = np.radians(ref_lat)
        phi2 = np.radians(lat_arr)
        delta_phi = np.radians(lat_arr - ref_lat)
        delta_lambda = np.radians(lon_arr - ref_lon)
        
        a = np.sin(delta_phi / 2.0) ** 2 + \
            np.cos(phi1) * np.cos(phi2) * \
            np.sin(delta_lambda / 2.0) ** 2
        
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        
        distances = R * c
        return distances
    
    def _calculate_remoteness_score(self, lat: float, lon: float) -> float:
        """Calculate remoteness score based on cell tower density."""
        if self.cell_towers_df.empty:
            return 0.5  # Default value if no data
        
        distances = self._compute_haversine_distances(
            self.cell_towers_df['lat'], 
            self.cell_towers_df['long'], 
            ref_lat=lat, 
            ref_lon=lon
        )
        
        # Filter distances to only those less than 100 km
        distances = distances[distances < 100]
        
        radii = [0.5, 1, 5, 15]  # km
        metrics = {}
        
        for r in radii:
            mask = distances <= r
            count = np.sum(mask)
            density = count / (np.pi * r**2)  # towers per km²
            metrics[f'count_{r}km'] = count
            metrics[f'density_{r}km'] = density
        
        # Compute remoteness score
        c05 = metrics.get('count_0.5km', 0) + 1
        c1 = metrics.get('count_1km', 0) + 1
        c5 = metrics.get('count_5km', 0) + 1
        c15 = metrics.get('count_15km', 0) + 1
        
        # Log transform
        l05, l1, l5, l15 = map(np.log10, [c05, c1, c5, c15])
        
        # Normalize to 0-1
        norm05 = 1 - min(l05 / np.log10(25+1), 1)
        norm1 = 1 - min(l1 / np.log10(62+1), 1)
        norm5 = 1 - min(l5 / np.log10(726+1), 1)
        norm15 = 1 - min(l15 / np.log10(2486+1), 1)
        
        # Weighted average
        score = (0.2*norm05 + 0.3*norm1 + 0.3*norm5 + 0.2*norm15)
        
        return round(score, 3)
    
    def _get_nearest_osm_feature(self, lat: float, lon: float, tags: Dict = None, radius: int = 10000) -> Tuple[Optional[float], Optional[str]]:
        """Query Overpass API for nearest feature."""
        if tags is None:
            tags = {}
        
        tag_filters = ''.join([f'["{k}"="{v}"]' for k, v in tags.items()])
        query = f"""
        [out:json][timeout:25];
        (
          node{tag_filters}(around:{radius},{lat},{lon});
          way{tag_filters}(around:{radius},{lat},{lon});
          rel{tag_filters}(around:{radius},{lat},{lon});
        );
        out center 1;
        """
        
        url = "https://overpass-api.de/api/interpreter"
        try:
            response = requests.post(url, data={'data': query}, timeout=30)
            data = response.json()
            min_dist = None
            nearest_name = None
            
            for el in data.get('elements', []):
                if 'lat' in el and 'lon' in el:
                    lat2, lon2 = el['lat'], el['lon']
                elif 'center' in el:
                    lat2, lon2 = el['center']['lat'], el['center']['lon']
                else:
                    continue
                
                d = self._compute_haversine_distances([lat2], [lon2], lat, lon)[0]
                
                if (min_dist is None) or (d < min_dist):
                    min_dist = d
                    nearest_name = el.get('tags', {}).get('name')
            
            return min_dist, nearest_name
        except Exception as e:
            print(f"Overpass API error: {e}")
            return None, None
    
    def _calculate_accessibility_score(self, lat: float, lon: float) -> float:
        """Calculate accessibility score based on distance to amenities."""
        # Query for various amenities
        road_dist, _ = self._get_nearest_osm_feature(lat, lon, tags={'highway': ''})
        hospital_dist, _ = self._get_nearest_osm_feature(lat, lon, tags={'amenity': 'hospital'})
        police_dist, _ = self._get_nearest_osm_feature(lat, lon, tags={'amenity': 'police'})
        petrol_dist, _ = self._get_nearest_osm_feature(lat, lon, tags={'amenity': 'fuel'})
        atm_dist, _ = self._get_nearest_osm_feature(lat, lon, tags={'amenity': 'atm'})
        pharmacy_dist, _ = self._get_nearest_osm_feature(lat, lon, tags={'amenity': 'pharmacy'})
        hotel_dist, _ = self._get_nearest_osm_feature(lat, lon, tags={'tourism': 'hotel'})
        
        # Normalize distances (cap at 50 km)
        norm_road = min((road_dist or 50) / 50, 1)
        norm_hospital = min((hospital_dist or 50) / 50, 1)
        norm_police = min((police_dist or 50) / 50, 1)
        norm_petrol = min((petrol_dist or 50) / 50, 1)
        norm_atm = min((atm_dist or 50) / 50, 1)
        norm_pharmacy = min((pharmacy_dist or 50) / 50, 1)
        norm_hotel = min((hotel_dist or 50) / 50, 1)
        
        # Weighted average
        score = (
            0.2 * norm_road +
            0.2 * norm_hospital +
            0.15 * norm_police +
            0.15 * norm_petrol +
            0.1 * norm_atm +
            0.1 * norm_pharmacy +
            0.1 * norm_hotel
        )
        
        return round(score, 3)
    
    def _get_environmental_hazard_score(self, lat: float, lon: float) -> float:
        """Get environmental hazard score from weather data."""
        api_url = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}"
        headers = {
            "User-Agent": "LocationSafetyCalculator/1.0"
        }
        
        try:
            response = requests.get(api_url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            timeseries = data.get("properties", {}).get("timeseries", [])
            if not timeseries:
                return 0.1  # Default low hazard
            
            current = timeseries[0].get("data", {}).get("next_1_hours", {}).get("summary", {})
            symbol_code = current.get("symbol_code", "").lower()
            
            # Assign hazard scores based on weather conditions
            if "thunderstorm" in symbol_code or "tornado" in symbol_code or "extreme" in symbol_code or "cyclone" in symbol_code:
                score = 0.95
            elif "heavyrain" in symbol_code or "rainshowers_heavy" in symbol_code:
                score = 0.8
            elif "rain" in symbol_code or "showers" in symbol_code:
                score = 0.6
            elif "heavysnow" in symbol_code or "snow" in symbol_code:
                score = 0.5
            elif "fog" in symbol_code or "mist" in symbol_code:
                score = 0.4
            elif "dust" in symbol_code or "sand" in symbol_code:
                score = 0.4
            elif "hot" in symbol_code or "heatwave" in symbol_code:
                score = 0.7
            elif "clearsky" in symbol_code or "fair" in symbol_code:
                score = 0.0
            else:
                score = 0.1
            
            return round(score, 3)
        
        except Exception as e:
            print(f"Error fetching environmental hazard score: {e}")
            return 0.1  # Default low hazard


# Example usage
# if __name__ == "__main__":
#     # Initialize calculator
#     calculator = LocationSafetyCalculator(cell_tower_csv_path='./cell tower coverage/404.csv')
    
#     # Calculate safety score
#     lat, lon = 14.858578, 69.247597
#     is_geofenced = False
    
#     # Get simple score and risk level
#     safety_score, risk_level = calculator.calculate_safety_score(lat, lon, is_geofenced)
#     print(f"Safety Score: {safety_score}%")
#     print(f"Risk Level: {risk_level}")
    
#     # Get detailed breakdown
#     # details = calculator.get_detailed_scores(lat, lon, is_geofenced)
#     # print("\nDetailed Scores:")
#     # for key, value in details.items():
#     #     print(f"  {key}: {value}")