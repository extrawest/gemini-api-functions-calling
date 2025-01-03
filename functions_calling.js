import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { searchAttractionsFunctionDeclaration, searchAttractionsFunction } from './attractions_service.js';
import { searchHotelsFunctionDeclaration, searchHotelsFunction } from './hotels_service.js';
import { searchFlightsFunctionDeclaration, searchFlightsFunction } from './flights_service.js';

dotenv.config();
const functions = {
    searchAttractions: searchAttractionsFunction,
    searchFlights: searchFlightsFunction,
    searchHotels: searchHotelsFunction
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
