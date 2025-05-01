export  const getImages = async (search_terms: string, width: number, height: number, number_of_photos: number = 10): Promise<string> => {
  // Use hardcoded Unsplash images for different searches to avoid API issues
  const defaultImages = {
    "online auction premium": "https://images.unsplash.com/photo-1630265128146-8afbbdbbe1bd?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw0fHxhdWN0aW9uJTIwcHJlbWl1bXxlbnwwfHx8fDE3NDU5ODY1NzZ8MA&ixlib=rb-4.0.3",
    "auction": "https://images.unsplash.com/photo-1745135014859-8659068ec9dd?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwxfHxhdWN0aW9uJTIwcHJlbWl1bXxlbnwwfHx8fDE3NDU5ODY1NzZ8MA&ixlib=rb-4.0.3",
    "electronics": "https://images.unsplash.com/photo-1550009158-9ebf69173e03?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1201&q=80",
    "jewelry": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
    "art": "https://images.unsplash.com/photo-1569930784237-ea65a2129a7d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1157&q=80",
    "furniture": "https://images.unsplash.com/photo-1558442086-8ea5ff4c0cbf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1026&q=80",
    "collectibles": "https://images.unsplash.com/photo-1599409636295-e3cf8ea63854?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
    "luxury": "https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBhdWN0aW9uJTIwbHV4dXJ5JTIwaXRlbXN8ZW58MHx8fHwxNzQ2MDI2MTcxfDA&ixlib=rb-4.0.3",
    "car": "https://images.unsplash.com/photo-1522255272218-7ac5249be344?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwyfHxvbmxpbmUlMjBhdWN0aW9uJTIwbHV4dXJ5JTIwaXRlbXN8ZW58MHx8fHwxNzQ2MDI2MTcxfDA&ixlib=rb-4.0.3",
    "yacht": "https://images.unsplash.com/photo-1500627964684-141351970a7f?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw0fHxvbmxpbmUlMjBhdWN0aW9uJTIwbHV4dXJ5JTIwaXRlbXN8ZW58MHx8fHwxNzQ2MDI2MTcxfDA&ixlib=rb-4.0.3",
    "plane": "https://images.unsplash.com/photo-1512100356356-de1b84283e18?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHw1fHxvbmxpbmUlMjBhdWN0aW9uJTIwbHV4dXJ5JTIwaXRlbXN8ZW58MHx8fHwxNzQ2MDI2MTcxfDA&ixlib=rb-4.0.3",
    "vintage": "https://images.unsplash.com/photo-1541239370886-851049f91487?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwzfHxvbmxpbmUlMjBhdWN0aW9uJTIwbHV4dXJ5JTIwaXRlbXN8ZW58MHx8fHwxNzQ2MDI2MTcxfDA&ixlib=rb-4.0.3"
  };

  // Find a matching image or use default
  for (const [key, url] of Object.entries(defaultImages)) {
    if (search_terms.toLowerCase().includes(key.toLowerCase())) {
      return url;
    }
  }

  // Return default image if no match found
  return defaultImages["luxury"];
};
 