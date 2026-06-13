import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") || "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
    const { record } = await req.json();
    if (!record || !record.phone || !record.message) {
      return new Response("Invalid webhook payload", { status: 400 });
    }

    const { id, phone, message, booking_id } = record;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Processing SMS queue item ${id} for Booking ${booking_id}...`);

    // Standardize mobile number prefix to +91 (India)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.startsWith("91") ? `+${formattedPhone}` : `+91${formattedPhone}`;
    }

    // Call Twilio REST API
    const authString = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const bodyParams = new URLSearchParams();
    bodyParams.append("To", formattedPhone);
    bodyParams.append("From", TWILIO_FROM_NUMBER);
    bodyParams.append("Body", message);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authString}`
      },
      body: bodyParams.toString()
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`SMS sent successfully via Twilio! SID: ${data.sid}`);
      
      // Update queue item status to SENT
      await supabase
        .from("sms_queue")
        .update({ status: "SENT" })
        .eq("id", id);

      return new Response(JSON.stringify({ success: true, sid: data.sid }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    } else {
      throw new Error(data.message || "Failed to send via Twilio");
    }

  } catch (err: any) {
    console.error("SMS Sending Error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
});
