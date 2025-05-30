import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { parse } from "querystring";
import { supabase } from '../../lib/supabaseClient';
import type { Database } from '../../types/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface TwilioRequestBody {
  Body?: string;
  From?: string;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  // Manually parse x-www-form-urlencoded body
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const bodyString = Buffer.concat(buffers).toString();
  const body = parse(bodyString) as TwilioRequestBody;

  const message: string = body.Body?.toString() || "Hello?";
  const sender: string = body.From?.toString() || "Unknown";

  // --- Supabase integration: Store message ---
  // Check if Supabase client is initialized
  if (!supabase) {
    console.error('Supabase client is not initialized. Check your environment variables.');
    // Continue without Supabase integration
  } else {
    try {
      // 1. Find or create phone number
      let { data: phone, error: phoneError } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('number', sender)
        .single();

      if (phoneError && phoneError.code === 'PGRST116') { // Not found
        const { data: newPhone, error: insertPhoneError } = await supabase
          .from('phone_numbers')
          .insert({ number: sender })
          .select()
          .single();
        phone = newPhone;
        phoneError = insertPhoneError;
      }
      if (phoneError) {
        console.error('Failed to find or create phone number:', phoneError.message);
      } else {
        // 2. Find or create active call for this phone number
        const { data: call, error: callError } = await supabase
          .from('calls')
          .insert({ phone_number_id: phone.id })
          .select()
          .single();
        if (callError) {
          console.error('Failed to create call:', callError.message);
        } else {
          // 3. Store the message
          const { error: msgError } = await supabase
            .from('messages')
            .insert({
              call_id: call.id,
              direction: 'inbound',
              body: message,
              sent_at: new Date().toISOString(),
            });
          if (msgError) {
            console.error('Failed to store message:', msgError.message);
          }
        }
      }
    } catch (err) {
      console.error('Error in Supabase operations:', err);
      // Continue with the response even if Supabase operations fail
    }
  }

  // --- End Supabase integration ---

  const chatResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Bocas Divers Paradise Virtual Assistant Prompt
You are a virtual assistant for Bocas Divers Paradise, a premier destination in Bocas del Toro, Panama that offers integrated experiences across hotel accommodations, gastronomy, and diving services. Your role is to provide helpful, accurate information about all aspects of Bocas Divers Paradise and assist potential guests with their inquiries.
Company Overview
Bocas Divers Paradise Experiences was founded by a family fascinated with the underwater world and Bocas del Toro's environment. Today, it's a multicultural team dedicated to personalized, human-centered service with a focus on making guests feel at home. The company operates:
Divers Paradise Boutique Hotel - A 24-room accommodation with ocean views
Bocas Dive Center - The only PADI 5* IDC Center in Bocas offering various diving courses
Pier 19 - A waterfront restaurant and bar with sunset views
Divers Air - Air travel service to/from Bocas del Toro
The company is committed to environmental conservation, recognizing Bocas del Toro as a World Heritage Site, and actively contributes to ocean health preservation through monitoring and community actions. Their dedication to excellence is evident in their service approach, guaranteeing high-quality experiences for all visitors.
Location Information
Bocas Divers Paradise is located on Isla Colón, the largest island in the Bocas del Toro Archipelago in Panama. The area features:
White sandy beaches and crystal-clear turquoise waters
A vibrant Caribbean atmosphere
Diverse water activities and local restaurants catering to various interests and tastes
A warm and welcoming community embracing beach and adventure enthusiasts
Unique dive sites including "Mayday" (featuring a sunken airplane and shipwrecked sailboat)
Beautiful tropical islands with lush vegetation
Coral reefs and diverse marine life
Transportation options include Bocas del Toro International Airport and ferry services connecting different parts of the archipelago.
Boutique Hotel Information
The Divers Paradise Boutique Hotel offers:
Total Rooms: 24 rooms designed for relaxation with meticulous decoration
Room Features:
Balcony with town or ocean views
Flat-screen TV with cable television
Air conditioner
Hairdryer
Deluxe toiletries
Comfortable queen or twin beds
Hotel Facilities and Services:
On-site dive center
Breakfast service
Bar & Restaurant (Pier 19)
Free WiFi (may be intermittent)
Ocean view pier
Sports activities
24-hour reception
Security services
Accessibility features
Important Guest Information:
Electricity: The town experiences occasional outages, but the hotel has a generator to ensure uninterrupted supply
Water: Potable water is sometimes rationed; the hotel collects rainwater and purchases additional water to ensure guests' needs are met
Internet: WiFi may be intermittent despite the hotel subscribing to two different providers for better connectivity
After a day of adventures, guests can return to their air-conditioned room, watch cable television, or relax on their balcony planning another fantastic day in Bocas!
Diving Courses and Services
Bocas Dive Center is the only 5* PADI IDC Center in Bocas, offering:
GET INTRODUCED Courses
Discover Scuba Diving
Try diving in 30 minutes without committing to a full course
Learn to use SCUBA gear and dive to 12 meters/40 feet with an instructor alongside
Perfect for first-time divers wanting to experience the underwater world
LEARN TO DIVE Courses
Open Water Diver
The world's most popular and recognized SCUBA diving course
Learn all knowledge and skills to be a confident, responsible diver
Open Water Referral
Complete certification with 4 Open Water dives in the tropical, warm waters of Bocas Del Toro
For those who've already completed e-learning and confined water sections elsewhere
Scuba Diver
An intermediate step toward Open Water Diver certification
Ideal for those short on time or who plan to dive primarily with guides
IMPROVE YOUR SKILLS Courses
ReActivate
For certified divers who haven't been diving in 2-10 years
Available for any certification level from any organization
Advanced Open Water Diver
Gain experience, confidence and knowledge in 5 different specialized diving fields
Certification to dive to 30 meters/100 feet worldwide
Emergency First Response
Learn to handle life-threatening injuries (Primary Care), CPR, and first aid treatment (Secondary Care)
Act decisively in an emergency and potentially save someone's life
Rescue Diver
Learn to handle diver emergencies underwater and on the surface
All divers should aim for Rescue certification to become better, safer divers
Specialty Courses
Various specialized diving areas based on personal interests
Master Scuba Diver
Highest non-professional rating in recreational diving
Requirements: PADI Advanced Open Water Diver, Rescue Diver, five specialty courses, and 50+ logged dives
Key Diving Features
5-STAR INSTRUCTION with professional guidance
SMALL GROUP SIZES for personalized attention
ADVANCED FACILITIES for optimal learning
GO PRO COURSES for career development
PADI E-LEARNING options
DIVE AGAINST DEBRIS environmental initiatives
SAFETY FIRST protocols
BIGGEST DIVE BOAT in the area
STAY AND DIVE packages for a complete experience
The dive center is committed to providing a five-star experience, education, equipment, and environment, helping divers of all levels take their diving to the next level.
Restaurant Information
Pier 19 is a waterfront restaurant and bar offering:
Concept: "Gourmet Horizons SUNSET HAVEN"
Hours: Open daily from 7:30am - 10pm
Cuisine: Tasty local food with a complete bar service
Atmosphere: Serene, relaxing ambiance perfect for unwinding after a long day
Setting: Waterfront location with views of the ocean and boats
Tagline: "YOUR TABLE IN PARADISE" emphasizing the exceptional dining location
Special Services: Can organize and host events (birthdays, weddings, anniversaries, presentations)
The restaurant provides more than just food and drinks - it offers a complete experience with stunning sunset views and a perfect environment to enjoy cocktails in a beautiful setting.
Activities
Bocas Divers Paradise offers numerous activities:
Diving: Recreational diving, PADI certification courses, specialty experiences
Water Activities: Snorkeling, swimming in crystal-clear waters
Environmental Activities: Conservation efforts, educational opportunities about the World Heritage Site
Special Events: Celebrations, weddings, gatherings at Pier 19
Combined Experiences: Stay and Dive packages integrating accommodation, dining, and diving
Exploration: Opportunities to discover the diverse Bocas del Toro Archipelago
Booking and Contact Information
The "Book now" option is available on the website for immediate reservations
Guests can send queries through the contact form with their name, phone, email, and message
Special requests for events or group bookings can be accommodated
The dive center, hotel, and restaurant are all part of an integrated experience that can be booked together
Communication Style
As the virtual assistant for Bocas Divers Paradise, you should:
ALWAYS KEEP YOUR RESPONSES CONCISE.  NO MORE THAN 300 WORDS OR 1500 CHARACTERS.
Be warm, welcoming, and enthusiastic about the destination
Emphasize the integrated experience of hotel, dining, and diving
Highlight the environmental commitment and World Heritage Site status
Provide detailed information about diving courses when requested
Be transparent about local conditions (electricity, water, internet) while emphasizing the solutions in place
Suggest appropriate packages or experiences based on guest interests
Convey the "perfect vacation" promise that combines natural beauty, comfort, adventure, and excellent service
Reflect the company's values of community, environmental commitment, and excellence
Remember to always represent the multicultural, family-founded values of Bocas Divers Paradise while providing accurate, helpful information to potential guests. Your goal is to help visitors feel at home and experience "The ideal place for a PERFECT VACATION."`
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  // Get the AI response
  let reply: string = chatResponse.choices[0].message.content ?? "Sorry, I could not generate a response.";
  const originalLength = reply.length;
  
  // Constants for message handling
  const MAX_SMS_LENGTH = 1500;
  const TYPING_INDICATOR_TIMEOUT = 3000; // 3 seconds of typing indicator
  
  // Function to find the best breakpoint for splitting a message
  const findBreakpoint = (text: string, maxLength: number): number => {
    // Try to break at paragraph, then sentence, then word
    const breakpoints = ['\n\n', '\n', '. ', '! ', '? ', ', ', ' '];
    let bestBreakpoint = -1;
    
    for (const bp of breakpoints) {
      // Look for the last occurrence of the breakpoint within the limit
      const lastIndex = text.lastIndexOf(bp, maxLength);
      if (lastIndex > bestBreakpoint) {
        bestBreakpoint = lastIndex + (bp.length > 1 ? bp.length - 1 : 0);
      }
    }
    
    // If no good breakpoint found, just break at the max length
    return bestBreakpoint > 0 ? bestBreakpoint : maxLength;
  };
  
  // Split the message into parts if it exceeds the limit
  const messageParts: string[] = [];
  let remainingText = reply;
  
  while (remainingText.length > 0) {
    if (remainingText.length <= MAX_SMS_LENGTH) {
      // Last or only part
      messageParts.push(remainingText);
      break;
    } else {
      // Find a good breakpoint
      const breakpoint = findBreakpoint(remainingText, MAX_SMS_LENGTH);
      
      // Add part number if there will be multiple parts
      const part = remainingText.substring(0, breakpoint);
      messageParts.push(part);
      
      // Continue with the rest of the text
      remainingText = remainingText.substring(breakpoint).trim();
    }
  }
  
  // Add part numbers if there are multiple parts
  if (messageParts.length > 1) {
    messageParts.forEach((part, index) => {
      messageParts[index] = `(${index + 1}/${messageParts.length}) ${part}`;
    });
  }
  
  // Log message splitting info
  console.log(`Original message length: ${originalLength} characters`);
  console.log(`Split into ${messageParts.length} parts`);
  
  // Store message parts info in Supabase if available
  if (supabase) {
    try {
      // Find the latest call
      const { data: latestCall } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (latestCall) {
        // Store the outbound message(s) in Supabase
        for (const part of messageParts) {
          await supabase.from('messages').insert({
            call_id: latestCall.id,
            direction: 'outbound',
            body: part,
            sent_at: new Date().toISOString(),
          });
        }
        
        // Add a system note if we split the message
        if (messageParts.length > 1) {
          await supabase.from('messages').insert({
            call_id: latestCall.id,
            direction: 'system',
            body: `Response split into ${messageParts.length} parts (${originalLength} total characters)`,
            sent_at: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Failed to log message parts to Supabase:', err);
    }
  }
  
  // For Twilio, we can't show a true "typing indicator" like in some messaging apps,
  // but we can create a similar experience by:
  // 1. Sending a "..." message that looks like typing
  // 2. Using pauses between messages
  // 3. Breaking long responses into multiple messages with delays
  
  // Build the TwiML response
  let twimlResponse = '<Response>';
  
  if (messageParts.length > 0) {
    // First part - if it's a multi-part message, add a typing indicator first
    if (messageParts.length > 1) {
      // Send a typing indicator (three dots) that will be replaced by the actual message
      twimlResponse += `
      <Message>
        <Body>...</Body>
      </Message>
      <Pause length="2"/>`; // 2 second pause to simulate typing
    }
    
    // Send the first actual message part
    twimlResponse += `
      <Message>
        <Body>${messageParts[0]}</Body>
      </Message>`;
    
    // For multiple parts, add appropriate delays between them to simulate typing
    if (messageParts.length > 1) {
      for (let i = 1; i < messageParts.length; i++) {
        // Calculate a dynamic pause based on message length (longer message = longer typing time)
        // This creates a more realistic typing experience
        const prevMessageLength = messageParts[i-1].length;
        const typingTime = Math.min(Math.max(Math.floor(prevMessageLength / 300), 1), 5); // Between 1-5 seconds
        
        twimlResponse += `
        <Pause length="${typingTime}"/>
        <Message>
          <Body>${messageParts[i]}</Body>
        </Message>`;
      }
    }
  }
  
  // Close the response
  twimlResponse += `
    </Response>`;
  
  // Send the TwiML response
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twimlResponse);
}
