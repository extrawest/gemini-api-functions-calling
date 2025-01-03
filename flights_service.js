import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function searchFlights({ origin, destination, date, passengers, cabinClass }) {
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

export const searchFlightsFunctionDeclaration = {
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

export const searchFlightsFunction = (params) => {
    return searchFlights(params);
};
