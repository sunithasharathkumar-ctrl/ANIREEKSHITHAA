import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { hmac } from "https://deno.land/x/hmac@v1.9.0/mod.ts";

const RZP_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RZP_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();

    // 1. Securely Create Order
    if (action === "create_order") {
      const { amount } = payload; // amount in INR
      const amountInPaisa = Math.round(amount * 100);

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${btoa(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`)}`
        },
        body: JSON.stringify({
          amount: amountInPaisa,
          currency: "INR",
          receipt: `receipt_anr_${Date.now()}`
        })
      });

      const orderData = await response.json();
      if (!response.ok) throw new Error(orderData.error?.description || "Failed to create Razorpay order");

      return new Response(JSON.stringify({ orderId: orderData.id, keyId: RZP_KEY_ID }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // 2. Verify Razorpay Payment Signature
    if (action === "verify_payment") {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = payload;

      // Verify HMAC-SHA256 signature
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const signature = hmac("sha256", RZP_KEY_SECRET, text, "utf-8", "hex");

      if (signature !== razorpay_signature) {
        return new Response(JSON.stringify({ verified: false, error: "Signature verification failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        });
      }

      return new Response(JSON.stringify({ verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    throw new Error("Invalid Action");

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
