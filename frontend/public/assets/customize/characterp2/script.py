import requests
import os

# La URL base de las imágenes
url_base = "https://cg-assets-static.pages.dev/ddr/lane_covers_dp/"

# Crea la carpeta para guardar las imágenes si no existe
folder_name = "ddr_lane_covers_dp"
if not os.path.exists(folder_name):
    os.makedirs(folder_name)

# Bucle para descargar las imágenes del 1 al 40
for i in range(1, 41):
    # Construye el nombre del archivo y la URL
    file_name = f"{i}.png"
    full_url = url_base + file_name
    file_path = os.path.join(folder_name, file_name)
    
    try:
        # Descarga la imagen
        response = requests.get(full_url)
        response.raise_for_status()

        # Guarda el contenido en un archivo
        with open(file_path, "wb") as f:
            f.write(response.content)
            
        print(f"Descargado exitosamente: {file_name}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error al descargar {file_name}: {e}")

print("Proceso de descarga completado.")