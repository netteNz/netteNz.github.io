import folium
import pandas as pd
from pyodide.http import open_url
from js import document, console

  
try:
    url = "https://raw.githubusercontent.com/netteNz/earthquakes-pr/refs/heads/master/query45.csv"

    pr = folium.Map(location=[18.2208, -66.5901],
                    zoom_start=9,
                    tiles='cartodbdark_matter',
                    prefer_canvas=True,
                    control_scale=True,
                    width='100%',
                    height='100%'
                  )
    
    pr.get_name()  # Force initialization
    # Additional styling for the map
    pr.get_root().header.add_child(folium.Element("""
        <style>
            .leaflet-container { background: #0d1117 !important; }
            
            /* Fix popup borders and styling */
            .leaflet-popup-content-wrapper {
                background-color: #1f2937 !important;
                border-radius: 6px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
                border: none !important;
            }
            
            .leaflet-popup-tip {
                background-color: #1f2937 !important;
                box-shadow: none !important;
                border: none !important;
            }
            
            .leaflet-popup-content {
                margin: 0 !important;
                padding: 0 !important;
            }
        </style>
    """))
    
    data = open_url(url)
    
    df = pd.read_csv(data,
                    usecols=['latitude', 'longitude', 'place', 'mag', 'time'],
                    )
    df.sort_index()
    
    # Function to set circle color based on earthquake magnitude
    def get_circle_color(magnitude):
        if magnitude < 4:
            return '#00FF00'  # Green for small earthquakes
        elif 4.5 <= magnitude < 5.5:
            return '#FFFF00'  # Yellow for moderate earthquakes
        else:
            return '#FF0000'  # Red for strong earthquakes
    
    # Loop through each row in the dataframe and create circle markers
    for index, row in df.iterrows():
        # Adjust radius for visibility, e.g., 3 * magnitude
        radius = row['mag'] * 3
        color = get_circle_color(row['mag'])  # Set color based on magnitude
        
        # Update the popup_html styling for better contrast
        popup_html = f"""
<div class="earthquake-popup" style="font-family: 'JetBrains Mono', monospace; min-width: 200px; background-color: #1f2937; padding: 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
    <h3 style="margin-bottom: 8px; color: #ffffff; border-bottom: 1px solid #4b5563; padding-bottom: 5px;">Earthquake Details</h3>
    <div style="margin: 5px 0;"><span style="color: #9ca3af; font-weight: 500;">Location:</span> <span style="color: #ffffff;">{row['place']}</span></div>
    <div style="margin: 5px 0;"><span style="color: #9ca3af; font-weight: 500;">Magnitude:</span> <span style="color: {color}; font-weight: bold;">{row['mag']}</span></div>
    <div style="margin: 5px 0;"><span style="color: #9ca3af; font-weight: 500;">Coordinates:</span> <span style="color: #ffffff;">{row['latitude']:.4f}, {row['longitude']:.4f}</span></div>
    <div style="margin: 5px 0;"><span style="color: #9ca3af; font-weight: 500;">Time:</span> <span style="color: #ffffff;">{pd.to_datetime(row['time']).strftime('%Y-%m-%d %H:%M:%S')}</span></div>
</div>
        """
        
        # Add the CircleMarker to the map with enhanced popup
        folium.CircleMarker(location=(row['latitude'], row['longitude']),
                            radius=radius,
                            color=color,
                            fill=True,
                            fill_color=color,
                            fill_opacity=0.6,
                            popup=folium.Popup(popup_html, max_width=300),  # Use Popup object with HTML content
                            ).add_to(pr)
    
    map_html = pr._repr_html_()
    element = document.getElementById("folium")
    if element:
        element.innerHTML = map_html
        console.log("Map loaded successfully")
        
        # Dispatch event to signal map is loaded
        from js import window
        map_loaded_event = window.document.createEvent('Event')
        map_loaded_event.initEvent('map:loaded', True, True)
        window.document.dispatchEvent(map_loaded_event)
    else:
        console.error("Element with ID 'folium' not found")
except Exception as e:
    console.error(f"Error: {str(e)}")