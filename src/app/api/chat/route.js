// src/app/api/chat/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server'; // Import NextResponse for App Router APIs

// Ensure the API key is available from environment variables
// This key should be set in a .env.local file for local development
// and as an environment variable in Vercel for deployment.
const API_KEY = process.env.GOOGLE_API_KEY;

// Initialize Google Generative AI
// It's important to instantiate this once to reuse the configuration.
const genAI = new GoogleGenerativeAI(API_KEY);

// Define the POST handler for the API route
// In the App Router, specific HTTP methods are exported as functions (GET, POST, etc.)
export async function POST(request) {
  // Extract the dishName from the request body
  // Request body is now accessed via request.json()
  const { dishName } = await request.json();

  // Basic validation for the input
  if (!dishName) {
    return NextResponse.json({ message: 'Dish name is required.' }, { status: 400 });
  }

  try {
    // Select the generative model.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Construct the prompt for the LLM
    // Updated prompt to match the user's request for Alton Brown persona and cross-contamination details.
    const prompt = `You are a food expert who helps people find allergens, speaking in a charismatic style like Alton Brown from the Food Network.
When given a dish name, first provide a brief (around 50 words) description of the dish, its origin, and popularity.
Then, **in a clear, bulleted list, using the '• ' character, identify common food allergens** for the dish.
Ensure each allergen is on a new line. Focus on these allergens: peanuts, tree nuts, milk, fish, shellfish, egg, soy, wheat, and gluten.
After the bulleted list of allergens, **assess the specific dish's likelihood of cross-contamination (e.g., high, low, or moderate) based on common kitchen practices and ingredients, then provide a general warning about cross-contamination in shared kitchen environments,** and always advise the user to confirm with the establishment.
Keep your response concise and directly address the allergens and cross-contamination.

The dish name is: "${dishName}"`;

    // Generate content using the model
    const result = await model.generateContent(prompt);
    const responseText = result.response.text(); // Get the plain text response

    // Send the LLM's response back using NextResponse
    return NextResponse.json({ response: responseText }, { status: 200 });

  } catch (error) {
    console.error("Error communicating with Gemini LLM:", error);
    // Return a user-friendly error message
    return NextResponse.json(
      { message: "A culinary misstep has occurred! It seems there's a glitch in our data stream, and I couldn&#39;t quite retrieve that information. Let's try that again, shall we?", error: error.message },
      { status: 500 }
    );
  }
}
