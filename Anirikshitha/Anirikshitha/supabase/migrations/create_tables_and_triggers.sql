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

-- Allow system and service role control of sms_queue
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
