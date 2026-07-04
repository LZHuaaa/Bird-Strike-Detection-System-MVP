import requests
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime

class BirdImageService:
    def __init__(self, unsplash_access_key=None):
        import os
        self.unsplash_key = unsplash_access_key or os.getenv('UNSPLASH_API_KEY')
        self.base_url = "https://api.unsplash.com/search/photos"
        
    def fetch_bird_image(self, bird_name, scientific_name=None):
        """Fetch bird image from Unsplash API"""
        if not self.unsplash_key:
            print("⚠️  No Unsplash API key provided. Using default images.")
            return self._get_default_image(bird_name)
        
        try:
            search_query = f"{bird_name} bird"
            params = {
                'query': search_query,
                'per_page': 1,
                'orientation': 'landscape'
            }
            
            headers = {
                'Authorization': f'Client-ID {self.unsplash_key}'
            }
            
            response = requests.get(self.base_url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data['results']:
                    image_info = data['results'][0]
                    image_url = image_info['urls']['regular']
                    
                    img_response = requests.get(image_url, timeout=10)
                    if img_response.status_code == 200:
                        image_data = base64.b64encode(img_response.content).decode('utf-8')
                        
                        return {
                            'image_url': image_url,
                            'image_data': image_data,
                            'image_source': 'unsplash',
                            'image_fetched_at': datetime.utcnow()
                        }
            
            return self._get_default_image(bird_name)
            
        except Exception as e:
            print(f"❌ Error fetching image for {bird_name}: {str(e)}")
            return self._get_default_image(bird_name)
    
    def _get_default_image(self, bird_name):
        """Generate default bird image based on category"""
        img = Image.new('RGB', (300, 200), color='lightblue')
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return {
            'image_url': None,
            'image_data': image_data,
            'image_source': 'default',
            'image_fetched_at': datetime.utcnow()
        }
