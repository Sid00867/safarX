from safetyscore import LocationSafetyCalculator

analyzer = LocationSafetyCalculator(cell_tower_csv_path='./cell tower coverage/404.csv')

lat = 13.0827
lon = 80.2707
is_geofenced = True

safety_score, risk_level = analyzer.calculate_safety_score(lat, lon, is_geofenced)
print(f"Safety Score: {safety_score}%")
print(f"Risk Level: {risk_level}")
