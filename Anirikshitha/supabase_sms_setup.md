# Supabase SMS Integration Setup Guide

This guide details the SQL database structures and serverless Edge Function code required to automate SMS ticket confirmations when bookings are paid and confirmed via Razorpay.

---

## 💻 1. SQL Schema & Database Triggers
Run the following SQL in your **Supabase SQL Editor** (`>_` icon on the left sidebar in your Supabase dashboard) to create the SMS queue table and automated trigger:

```sql
-- 1. Create a table to queue SMS messages
CREATE TABLE IF NOT EXISTS sms_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id text NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED'
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;

-- Allow public insert to sms_queue (if needed, but usually server-only)
-- For safety, only allow service_role and triggers to write
CREATE POLICY "Allow system control of sms_queue" ON sms_queue FOR ALL USING (true) WITH CHECK (true);

-- 2. Create the Trigger Function to automatically queue SMS on successful booking
CREATE OR REPLACE FUNCTION queue_booking_sms()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert only when booking paid_status changes to 'SUCCESSFUL' (confirmed)
  IF NEW.paid_status = 'SUCCESSFUL' AND (TG_OP = 'INSERT' OR OLD.paid_status != 'SUCCESSFUL') THEN
    INSERT INTO sms_queue (booking_id, phone, message)
    VALUES (
      NEW.booking_id,
      NEW.phone,
      'Hi ' || NEW.name || ', your ticket for Anireekshithaa Premiere on Sat, July 4 at 5:00 PM is CONFIRMED. Booking ID: ' || NEW.booking_id || '. Venue: Chamundeshwari Studios. Present this SMS at the gate!'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind the Trigger to the bookings table
DROP TRIGGER IF EXISTS trigger_queue_booking_sms ON bookings;
CREATE TRIGGER trigger_queue_booking_sms
AFTER INSERT OR UPDATE OF paid_status ON bookings
FOR EACH ROW
EXECUTE FUNCTION queue_booking_sms();
```

---

## ⚡ 2. Supabase Edge Function (SMS Sender)
To send the SMS using a gateway (such as Twilio), we can use a Supabase Edge Function that triggers on a webhook whenever a row is added to the `sms_queue` table.

### Deno Edge Function Code (`supabase/functions/send-sms/index.ts`):
Deploy this typescript script to your Supabase project:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") || "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
    // 1. Authenticate webhook or process payload
    const { record } = await req.json();
    if (!record || !record.phone || !record.message) {
      return new Response("Invalid webhook payload", { status: 400 });
    }

    const { id, phone, message, booking_id } = record;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Processing SMS queue item ${id} for Booking ${booking_id}...`);

    // 2. Format international phone number if necessary (ensure +91 prefix)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.startsWith("91") ? `+${formattedPhone}` : `+91${formattedPhone}`;
    }

    // 3. Make HTTP request to Twilio API
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
      
      // Update queue status to SENT
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
    
    // Attempt to mark as FAILED in queue
    try {
      const payload = await req.json().catch(() => ({}));
      if (payload.record && payload.record.id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("sms_queue")
          .update({ status: "FAILED", error_message: err.message })
          .eq("id", payload.record.id);
      }
    } catch (dbErr) {
      console.error("Failed to update error status in database", dbErr);
    }

    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
});
```

### ⚡ 3. How to Deploy:
1. Initialize Supabase CLI on your machine:
   ```bash
   supabase init
   ```
2. Create the function:
   ```bash
   supabase functions new send-sms
   ```
3. Copy the typescript code above into `supabase/functions/send-sms/index.ts`.
4. Deploy the function to the cloud:
   ```bash
   supabase functions deploy send-sms
   ```
5. Add your Twilio credentials in your Supabase Dashboard project settings under **Edge Functions -> Env Variables**:
   * `TWILIO_ACCOUNT_SID`
   * `TWILIO_AUTH_TOKEN`
   * `TWILIO_FROM_NUMBER`
6. Go to **Database -> Webhooks** in the dashboard and create a webhook:
   * **Table**: `sms_queue`
   * **Events**: `Insert`
   * **Action**: `Trigger Edge Function (send-sms)`
