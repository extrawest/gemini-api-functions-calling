import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import dotenv from 'dotenv';
import util from 'util';
dotenv.config();

async function setAttractionsValues(city) {
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

async function searchFlights({ origin, destination, date, passengers, cabinClass }) {
    try {
        const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY;
        const url = `https://api.flightapi.io/onewaytrip/${FLIGHT_API_KEY}/${origin}/${destination}/${date}/${passengers}/0/0/${cabinClass}/USD`;

        const response = await axios.get(url);

        // Check if response data exists
        if (!response.data || !response.data.itineraries) {
            throw new Error('No flight data available');
        }

        // Parse the flights from itineraries
        const flights = response.data.itineraries.map((itinerary) => {
            const pricingOption = itinerary.pricing_options?.[0];
            const price = pricingOption?.price?.amount || 'N/A';
            const lastUpdated = pricingOption?.price?.last_updated || 'N/A';

            // Get carrier information
            const carrierIds = pricingOption?.items?.[0]?.marketing_carrier_ids || [];

            // Get segment information
            const segments = pricingOption?.items?.[0]?.segment_ids || [];

            return {
                id: itinerary.id,
                price: {
                    amount: price,
                    currency: 'USD',
                    lastUpdated: lastUpdated
                },
                carriers: carrierIds,
                segments: segments,
                score: itinerary.score || 0
            };
        });

        // Sort flights by price
        const sortedFlights = flights.sort((a, b) => {
            const priceA = a.price.amount === 'N/A' ? Infinity : parseFloat(a.price.amount);
            const priceB = b.price.amount === 'N/A' ? Infinity : parseFloat(b.price.amount);
            return priceA - priceB;
        });

        // Get top 3 flights
        const top3Flights = sortedFlights.slice(0, 3).map((flight) => ({
            id: flight.id,
            price: flight.price.amount,
            carriers: flight.carriers,
            score: flight.score
        }));

        // Format the response
        const formattedResponse = {
            origin,
            destination,
            date,
            passengers,
            cabinClass,
            totalFlights: flights.length,
            top3Flights: top3Flights,
            cheapestPrice: top3Flights[0]?.price || 'N/A',
            summary: `Found ${
                flights.length
            } flights from ${origin} to ${destination} on ${date} for ${passengers} passenger(s) in ${cabinClass} class. The cheapest flight costs $${
                top3Flights[0]?.price || 'N/A'
            } USD.`,
            top3Summary: top3Flights
                .map((flight, index) => `Flight ${index + 1}: $${flight.price} USD, Carrier(s): ${flight.carriers.join(', ')}, Score: ${flight.score}`)
                .join('\n')
        };

        return formattedResponse;
    } catch (error) {
        console.error('Error details:', error.response?.data || error.message);
        throw new Error(`Error fetching flights: ${error.message}`);
    }
}

async function searchHotels({ cityId, checkin, checkout, rooms, adults }) {
    try {
        // Input validation
        if (!cityId) {
            throw new Error('City ID is required');
        }

        // Date format validation
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(checkin) || !dateRegex.test(checkout)) {
            throw new Error('Invalid date format. Use YYYY-MM-DD');
        }

        // Date logic validation
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const today = new Date();

        if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
            throw new Error('Invalid dates provided');
        }

        if (checkinDate < today) {
            throw new Error('Check-in date cannot be in the past');
        }

        if (checkoutDate <= checkinDate) {
            throw new Error('Check-out date must be after check-in date');
        }

        const maxStayDays = 30;
        const daysDifference = (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24);
        if (daysDifference > maxStayDays) {
            throw new Error(`Stay duration cannot exceed ${maxStayDays} days`);
        }

        // Rooms and adults validation
        if (!rooms || !adults) {
            throw new Error('Number of rooms and adults are required');
        }

        const numRooms = parseInt(rooms);
        const numAdults = parseInt(adults);

        if (isNaN(numRooms) || numRooms < 1) {
            throw new Error('Invalid number of rooms');
        }

        if (isNaN(numAdults) || numAdults < 1) {
            throw new Error('Invalid number of adults');
        }

        const maxAdultsPerRoom = 4;
        if (numAdults > numRooms * maxAdultsPerRoom) {
            throw new Error(`Maximum ${maxAdultsPerRoom} adults per room allowed`);
        }

        // API call configuration
        const HOTEL_API_KEY = process.env.HOTEL_API_KEY;
        const url = 'https://api.makcorps.com/city';

        const params = {
            cityid: cityId,
            pagination: '0',
            cur: 'USD',
            rooms: rooms,
            adults: adults,
            checkin: checkin,
            checkout: checkout,
            api_key: HOTEL_API_KEY
        };

        // Make API request
        const response = await axios.get(url, { params });

        // Validate API response
        if (!response.data) {
            throw new Error('No data received from hotel API');
        }

        if (!Array.isArray(response.data)) {
            throw new Error('Invalid response format from hotel API');
        }

        if (response.data.length === 0) {
            return {
                cityId,
                dates: { checkin, checkout },
                rooms,
                adults,
                totalHotels: 0,
                hotels: [],
                message: 'No hotels found for the specified criteria'
            };
        }

        // Process and format hotel data
        const hotels = response.data
            .map((hotel) => {
                // Validate required hotel properties
                if (!hotel.name || !hotel.hotelId) {
                    console.warn('Invalid hotel data found:', hotel);
                    return null;
                }

                return {
                    name: hotel.name,
                    id: hotel.hotelId,
                    location: hotel.geocode
                        ? {
                              latitude: hotel.geocode.latitude,
                              longitude: hotel.geocode.longitude
                          }
                        : null,
                    contact: hotel.telephone || 'N/A',
                    rating: hotel.reviews?.rating || 'N/A',
                    reviewCount: hotel.reviews?.count || 0,
                    prices: [
                        { vendor: hotel.vendor1, price: hotel.price1 },
                        { vendor: hotel.vendor2, price: hotel.price2 },
                        { vendor: hotel.vendor3, price: hotel.price3 },
                        { vendor: hotel.vendor4, price: hotel.price4 }
                    ].filter((price) => price.vendor && price.price) // Only include valid prices
                };
            })
            .filter((hotel) => hotel !== null); // Remove any invalid hotels

        // Sort hotels by price
        const sortedHotels = hotels.sort((a, b) => {
            const getLowestPrice = (hotel) => {
                const prices = hotel.prices.filter((p) => p.price).map((p) => parseFloat(p.price.replace('$', '').replace(',', '')));
                return prices.length > 0 ? Math.min(...prices) : Infinity;
            };
            return getLowestPrice(a) - getLowestPrice(b);
        });

        // Get top 3 hotels
        const top3Hotels = sortedHotels.slice(0, 3).map((hotel) => ({
            name: hotel.name,
            rating: hotel.rating,
            lowestPrice: Math.min(...hotel.prices.map((p) => parseFloat(p.price.replace('$', '').replace(',', ''))))
        }));
        return {
            cityId,
            dates: {
                checkin,
                checkout
            },
            rooms,
            adults,
            totalHotels: sortedHotels.length,
            top3Hotels: top3Hotels,
            allHotels: sortedHotels // Keep this if you still want all hotels in the response
        };
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Invalid API key or unauthorized access');
        } else if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later');
        } else if (error.response?.status === 404) {
            throw new Error('City not found or invalid city ID');
        }

        throw new Error(`Error fetching hotels: ${error.message}`);
    }
}
const searchAttractionsFunctionDeclaration = {
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

const searchFlightsFunctionDeclaration = {
    name: 'searchFlights',
    parameters: {
        type: 'OBJECT',
        description: 'Search for flights between two cities',
        properties: {
            origin: {
                type: 'STRING',
                description: 'Origin airport code (e.g., BER)'
            },
            destination: {
                type: 'STRING',
                description: 'Destination airport code (e.g., NRT)'
            },
            date: {
                type: 'STRING',
                description: 'Flight date in YYYY-MM-DD format'
            },
            passengers: {
                type: 'INTEGER',
                description: 'Number of passengers'
            },
            cabinClass: {
                type: 'STRING',
                description: 'Cabin class (Economy, Business, or First)'
            }
        },
        required: ['origin', 'destination', 'date', 'passengers', 'cabinClass']
    }
};

const searchHotelsFunctionDeclaration = {
    name: 'searchHotels',
    parameters: {
        type: 'OBJECT',
        description: 'Search for top 3 hotels in a city',
        properties: {
            cityId: {
                type: 'STRING',
                description: 'City ID for hotel search (e.g., "60763" for New York)'
            },
            checkin: {
                type: 'STRING',
                description: 'Check-in date in YYYY-MM-DD format'
            },
            checkout: {
                type: 'STRING',
                description: 'Check-out date in YYYY-MM-DD format'
            },
            rooms: {
                type: 'STRING',
                description: 'Number of rooms required'
            },
            adults: {
                type: 'STRING',
                description: 'Number of adults'
            }
        },
        required: ['cityId', 'checkin', 'checkout', 'rooms', 'adults']
    }
};

const functions = {
    searchAttractions: ({ city }) => {
        return setAttractionsValues(city);
    },
    searchFlights: (params) => {
        return searchFlights(params);
    },
    searchHotels: (params) => {
        return searchHotels(params);
    }
};

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const generativeModel = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    tools: {
        functionDeclarations: [searchAttractionsFunctionDeclaration, searchFlightsFunctionDeclaration, searchHotelsFunctionDeclaration]
    }
});

const chat = generativeModel.startChat();

async function processChat(prompt) {
    try {
        const result = await chat.sendMessage(prompt);
        const call = result.response.functionCalls()[0];
        if (!call) {
            console.log('No function calls received from the model');
            return;
        }

        const apiResponse = await functions[call.name](call.args);

        const detailedPrompt = formatResponse(call.name, apiResponse);

        const finalResult = await chat.sendMessage(detailedPrompt);
        console.log('Final response:', finalResult.response.text());
    } catch (error) {
        console.error('Error:', error);
    }
}

function formatResponse(functionName, apiResponse) {
    const formatters = {
        searchFlights: (res) => `
            Flight search results:
            ${res.summary}
            Top 3 Flights:
            ${res.top3Summary}
        `,
        searchHotels: (res) => `
            Hotel search results:
            Found ${res.totalHotels} hotels in ${res.cityId} from ${res.dates.checkin} to ${res.dates.checkout} for ${res.adults} adults in ${
            res.rooms
        } room(s).
            Top 3 Hotels:
            ${res.top3Hotels.map((hotel, i) => `${i + 1}. ${hotel.name} - Rating: ${hotel.rating}, Lowest Price: $${hotel.lowestPrice}`).join('\n')}
        `,
        searchAttractions: (res) => `
            Top attractions in ${res.city}:
            ${res.attractions.map((attr, i) => `${i + 1}. ${attr.name} - Rating: ${attr.rating}, Address: ${attr.address}`).join('\n')}
        `,
        default: (res) => `Search results:\n${JSON.stringify(res, null, 2)}`
    };

    const formatter = formatters[functionName] || formatters.default;
    return `${formatter(apiResponse)}\nPlease provide a detailed response that includes this information.`;
}

// Example usage:
// For attractions:
//processChat('what are the most popular attractions in Tokyo, Japan?');

// For flights:
// processChat('find flights from Berlin to Tokyo on January 18, 2025 for 1 passenger in Economy class');

// processChat('find hotels in New York from January 25 to January 26, 2025 for 2 adults in 1 room');
