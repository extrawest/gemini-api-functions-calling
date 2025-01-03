import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function searchHotels({ cityId, checkin, checkout, rooms, adults }) {
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

export const searchHotelsFunctionDeclaration = {
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

export const searchHotelsFunction = (params) => {
    return searchHotels(params);
};
