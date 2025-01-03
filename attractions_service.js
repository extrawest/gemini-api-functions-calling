import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function setAttractionsValues(city) {
    try {
        const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

        // First, get coordinates for the city
        const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(city)}&apiKey=${GEOAPIFY_API_KEY}`;
        const geocodeResponse = await axios.get(geocodeUrl);

        if (!geocodeResponse.data.features || geocodeResponse.data.features.length === 0) {
            throw new Error('City not found');
        }

        // Get the coordinates from the first result
        const location = geocodeResponse.data.features[0].geometry.coordinates;
        const [longitude, latitude] = location;

        // Search for places using Geoapify Places API
        const placesUrl = `https://api.geoapify.com/v2/places?categories=tourism.sights&filter=circle:${longitude},${latitude},5000&limit=3&apiKey=${GEOAPIFY_API_KEY}`;
        const placesResponse = await axios.get(placesUrl);

        if (!placesResponse.data.features) {
            throw new Error('No attractions found');
        }

        // Format the attractions data
        const attractions = placesResponse.data.features.map((place) => ({
            name: place.properties.name,
            address: place.properties.formatted,
            rating: place.properties.rating || 'No rating available',
            description: `${place.properties.name} is a popular tourist attraction in ${city}`,
            categories: place.properties.categories,
            distance: place.properties.distance
        }));

        return {
            city,
            attractions: attractions
        };
    } catch (error) {
        console.error('Error fetching attractions:', error);
        throw error;
    }
}

export const searchAttractionsFunctionDeclaration = {
    name: 'searchAttractions',
    parameters: {
        type: 'OBJECT',
        description: 'Search for most popular tourist attractions in a city',
        properties: {
            city: {
                type: 'STRING',
                description: 'City to search for attractions, e.g., Tokyo, Japan'
            }
        },
        required: ['city']
    }
};

export const searchAttractionsFunction = ({ city }) => {
    return setAttractionsValues(city);
};
