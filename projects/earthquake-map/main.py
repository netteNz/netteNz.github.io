import folium
import pandas as pd
from pyodide.http import open_url
from js import document, console

  
try:
    url = "https://raw.githubusercontent.com/netteNz/earthquakes-pr/refs/heads/master/query45.csv"

    pr = folium.Map(location=[18.2208, -66.5901],
                    zoom_start=8,
                    tiles='cartodbdark_matter',
                    prefer_canvas=True
                  )
    
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
        
        # Add the CircleMarker to the map
        folium.CircleMarker(location=(row['latitude'], row['longitude']),
                            radius=radius,
                            color=color,
                            fill=True,
                            fill_color=color,
                            fill_opacity=0.6,
                            popup=(f"Place: {row['place']}, Magnitude: {row['mag']}"),
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