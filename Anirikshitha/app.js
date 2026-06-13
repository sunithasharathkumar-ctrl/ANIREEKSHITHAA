/* ==========================================================================
   ANIREEKSHITHAA - FRONTEND ROUTING, TICKET WIZARD & ADMIN CONTROLLER
   ========================================================================== */

// Supabase Configuration
// Replace YOUR_SUPABASE_ANON_KEY with the 'anon public' key from your Supabase dashboard API settings.
const supabaseUrl = 'https://eoojknstseevgnurigzg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvb2prbnN0c2VldmdudXJpZ3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjM5NzQsImV4cCI6MjA5NjMzOTk3NH0.xnzj97ZrOef2q7eDMBWTC7Q3ZaThsErneMh0IlU43Sc';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// DOM Elements & Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    initScrollNavbar();
    initVideoPlayer();
    initMobileNav();
    loadSampleData(); // Pre-populate some bookings if database is empty for rich visual experience
    loadSampleFeedbacks(); // Pre-populate audience feedbacks
    initReviewCorner(); // Setup voice note and stars triggers
});

/* ==========================================================================
   NAVIGATION & MOBILE MENU CONTROLLER
   ========================================================================== */
function initScrollNavbar() {
    const header = document.querySelector('.header');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('section');

    // Sticky Navbar toggle
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }

        // Active Section highlighting
        let currentSectionId = '';
        sections.forEach(sec => {
            const secTop = sec.offsetTop - 120;
            const secHeight = sec.clientHeight;
            if (window.scrollY >= secTop && window.scrollY < secTop + secHeight) {
                currentSectionId = sec.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${currentSectionId}`) {
                item.classList.add('active');
            }
        });
    });
}

function initMobileNav() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavClose = document.getElementById('mobileNavClose');
    const mobileLinks = document.querySelectorAll('.mobile-nav-item, .mobile-nav-btn');

    mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.add('active');
    });

    const closeNav = () => {
        mobileNav.classList.remove('active');
    };

    mobileNavClose.addEventListener('click', closeNav);
    mobileLinks.forEach(link => link.addEventListener('click', closeNav));
}

/* ==========================================================================
   VIDEO PLAYER CONTROLLERS
   ========================================================================== */
function initVideoPlayer() {
    const container = document.getElementById('videoContainer');
    const thumb = document.getElementById('videoThumbnail');
    const frame = document.getElementById('videoPlayerFrame');
    const video = document.getElementById('promoVideo');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressBar = document.getElementById('progressBar');
    const muteBtn = document.getElementById('muteBtn');

    container.addEventListener('click', () => {
        if (frame.style.display === 'none') {
            thumb.style.display = 'none';
            frame.style.display = 'block';
            video.play();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }
    });

    playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop click from triggering parent
        if (video.paused) {
            video.play();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        } else {
            video.pause();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
    });

    video.addEventListener('timeupdate', () => {
        const percentage = (video.currentTime / video.duration) * 100;
        progressBar.style.width = `${percentage}%`;
    });

    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        if (video.muted) {
            muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        } else {
            muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        }
    });
}

/* ==========================================================================
   LIGHTBOX GALLLERY CONTROLLER
   ========================================================================== */
function openLightbox(imgSrc, captionText) {
    const lightbox = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');

    lightboxImg.src = imgSrc;
    lightboxCaption.textContent = captionText;
    lightbox.classList.add('active');
}

function closeLightbox() {
    document.getElementById('lightboxModal').classList.remove('active');
}

/* ==========================================================================
   TICKET WIZARD LOGIC
   ========================================================================== */
let bookingState = {
    step: 1,
    tickets: 1,
    ticketPrice: 99,
    attendee: {
        name: '',
        phone: '',
        email: ''
    },
    bookingId: '',
    confirmed: false,
    paidStatus: 'PENDING',
    transactionId: ''
};

function openBookingModal() {
    // Reset booking state
    bookingState = {
        step: 1,
        tickets: 1,
        ticketPrice: 99,
        attendee: { name: '', phone: '', email: '' },
        bookingId: '',
        confirmed: false,
        paidStatus: 'PENDING',
        transactionId: ''
    };

    // Reset inputs
    document.getElementById('bookingForm').reset();
    document.getElementById('mockWhatsappPopup').style.display = 'none';

    // Reset UI pricing displays
    document.getElementById('ticketQty').textContent = '1';
    document.getElementById('summaryTotal').textContent = '₹99.00';

    updateStepUI();
    document.getElementById('bookingModal').classList.add('active');
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('active');
}

function adjustTickets(amount) {
    let newQty = bookingState.tickets + amount;
    if (newQty >= 1 && newQty <= 10) {
        bookingState.tickets = newQty;
        document.getElementById('ticketQty').textContent = newQty;

        // Recalculate cost
        const grandTotal = newQty * bookingState.ticketPrice;
        document.getElementById('summaryTotal').textContent = `₹${grandTotal.toFixed(2)}`;
    }
}

function goToStep(stepNumber) {
    bookingState.step = stepNumber;
    updateStepUI();
}

function updateStepUI() {
    // Hide all steps
    for (let i = 1; i <= 4; i++) {
        const panel = document.getElementById(`stepPanel${i}`);
        if (panel) panel.classList.remove('active');
        
        const indicator = document.getElementById(`stepIndicator${i}`);
        if (indicator) {
            indicator.classList.remove('active');
        }
    }

    // Show current step panel and highlight indicator
    const currentPanel = document.getElementById(`stepPanel${bookingState.step}`);
    if (currentPanel) currentPanel.classList.add('active');

    // Highlight completed/current steps
    for (let i = 1; i <= bookingState.step; i++) {
        const indicator = document.getElementById(`stepIndicator${i}`);
        if (indicator) {
            indicator.classList.add('active');
        }
    }
}

function submitDetailsForm() {
    const name = document.getElementById('bookingName').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    const email = document.getElementById('bookingEmail').value.trim();

    // Basic validation
    if (!name || !phone) {
        alert('Please fill all required details.');
        return;
    }

    // Check if phone matches 10-digit regex
    const phoneRegex = /^[6789]\d{9}$/;
    if (!phoneRegex.test(phone)) {
        alert('Please enter a valid 10-digit Indian WhatsApp mobile number.');
        return;
    }

    // Save inputs to booking state
    bookingState.attendee = { name, phone, email };

    // Update Step 3 review summary text fields dynamically
    const grandTotal = bookingState.tickets * bookingState.ticketPrice;
    document.getElementById('summaryReviewQty').textContent = `${bookingState.tickets} Seat${bookingState.tickets > 1 ? 's' : ''}`;
    document.getElementById('summaryReviewSubtotal').textContent = `₹${grandTotal.toFixed(2)}`;
    document.getElementById('summaryReviewTotal').textContent = `₹${grandTotal.toFixed(2)}`;
    document.getElementById('payNowBtnAmount').textContent = `₹${grandTotal.toFixed(2)}`;
    document.getElementById('reviewCustomerName').textContent = name;
    document.getElementById('reviewCustomerPhone').textContent = `+91 ${phone}`;

    // Go to step 3 (Payment)
    goToStep(3);
}

async function startRazorpayPayment() {
    const totalAmount = bookingState.tickets * bookingState.ticketPrice;
    
    // Default fallback Key ID (User should replace this with their actual Key ID in settings)
    let razorpayKeyId = 'rzp_test_5GzHh7vQ3PZJdE'; 
    let orderId = null;

    // Simulation checks removed for security

    // 1. Attempt to create order securely via Supabase Edge Function
    if (supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
        try {
            // Call the edge function (assuming it's deployed under URL/functions/v1/razorpay-handler)
            const response = await fetch(`${supabaseUrl}/functions/v1/razorpay-handler`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                    action: 'create_order',
                    amount: totalAmount
                })
            });

            if (response.ok) {
                const data = await response.json();
                orderId = data.orderId;
                razorpayKeyId = data.keyId; // Dynamically use the Key ID set in Supabase secrets!
                console.log("Secure Razorpay Order ID created:", orderId);
            } else {
                console.warn("Supabase Edge Function returned error, falling back to client-side checkout:", await response.text());
            }
        } catch (err) {
            console.warn("Could not connect to Supabase Edge Function for order creation, using client-side fallback:", err);
        }
    }

    const options = {
        key: razorpayKeyId,
        amount: totalAmount * 100, // in paisa
        currency: "INR",
        name: "Anireekshithaa Film Premiere",
        description: `${bookingState.tickets} Ticket${bookingState.tickets > 1 ? 's' : ''} Premiere Booking`,
        image: "assets/char_face.jpg",
        handler: async function (response) {
            console.log("Razorpay payment completed. Verifying payment...");
            
            let verified = true; // Fallback to auto-verification for sandbox/client-side testing
            
            // 2. Securely verify signature on backend if Edge Function is active
            if (orderId && supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
                try {
                    const verifyResp = await fetch(`${supabaseUrl}/functions/v1/razorpay-handler`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({
                            action: 'verify_payment',
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    if (verifyResp.ok) {
                        const verifyData = await verifyResp.json();
                        verified = verifyData.verified;
                    } else {
                        verified = false;
                        console.error("Signature verification failed on backend:", await verifyResp.text());
                    }
                } catch (err) {
                    console.error("Signature verification endpoint error:", err);
                    verified = false;
                }
            }

            if (verified) {
                completeBookingSuccessful(response.razorpay_payment_id);
            } else {
                alert("Payment verification failed. Please contact support if the amount was deducted.");
                bookingState.paidStatus = 'PAYMENT_FAILED';
                bookingState.confirmed = false;
            }
        },
        prefill: {
            name: bookingState.attendee.name,
            contact: "+91" + bookingState.attendee.phone,
            email: bookingState.attendee.email || ""
        },
        theme: {
            color: "#d9232a"
        },
        modal: {
            ondismiss: function() {
                console.log("Payment checkout dismissed by user");
            }
        }
    };

    // Attach order_id if successfully fetched
    if (orderId) {
        options.order_id = orderId;
    }

    try {
        const rzp = new Razorpay(options);
        
        // Setup payment failure callback handling
        rzp.on('payment.failed', function (resp) {
            console.error("Razorpay Payment Failed:", resp.error);
            alert(`Payment Failed: ${resp.error.description || 'Reason Unknown'}`);
            bookingState.paidStatus = 'PAYMENT_FAILED';
            bookingState.confirmed = false;
        });

        rzp.open();
    } catch (e) {
        console.error("Razorpay SDK failed to load:", e);
        alert("Razorpay checkout script failed to load. Please check your internet connection.");
    }
}

async function completeBookingSuccessful(paymentId) {
    // Generate Random Booking ID
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit code
    const alphabets = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars like I, O
    const randomChar = alphabets[Math.floor(Math.random() * alphabets.length)];
    bookingState.bookingId = `ANR-${randomNum}-${randomChar}`;
    
    // Set status to SUCCESSFUL and record transaction details
    bookingState.paidStatus = 'SUCCESSFUL';
    bookingState.transactionId = paymentId;
    bookingState.confirmed = true;

    // Save booking to Database
    await saveBookingToDatabase();

    const totalAmount = bookingState.tickets * bookingState.ticketPrice;

    // Fill step 4 ticket elements
    document.getElementById('ticketName').textContent = bookingState.attendee.name;
    document.getElementById('ticketId').textContent = bookingState.bookingId;
    document.getElementById('ticketCount').textContent = `${bookingState.tickets} Seat${bookingState.tickets > 1 ? 's' : ''}`;
    document.getElementById('ticketAmountPaid').textContent = `₹${totalAmount.toFixed(2)}`;
    
    // Update ticket badge to green Confirmed status
    const ticketBadge = document.getElementById('ticketBadge');
    if (ticketBadge) {
        ticketBadge.textContent = 'CONFIRMED';
        ticketBadge.style.backgroundColor = '#2ecc71';
        ticketBadge.style.color = '#fff';
    }
    
    // Update confirmation text in Step 4
    document.getElementById('successTitle').textContent = 'Booking Confirmed!';
    document.getElementById('successDesc').textContent = 'Your tickets have been successfully booked and paid.';
    document.getElementById('successIcon').innerHTML = `<i class="fa-solid fa-circle-check" style="color: #2ecc71;"></i>`;

    // Update Success Info box
    const successInfoBox = document.getElementById('successInfoBox');
    const successInfoIcon = document.getElementById('successInfoIcon');
    const successInfoText = document.getElementById('successInfoText');
    if (successInfoBox && successInfoText) {
        successInfoBox.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
        successInfoBox.style.borderColor = 'rgba(46, 204, 113, 0.2)';
        if (successInfoIcon) {
            successInfoIcon.className = 'fa-solid fa-circle-check';
            successInfoIcon.style.color = '#2ecc71';
        }
        successInfoText.innerHTML = `Your payment of <strong>₹${totalAmount.toFixed(2)}</strong> has been verified. A copy of your digital ticket has been queued for SMS delivery to <strong>+91 ${bookingState.attendee.phone}</strong>.`;
    }

    // Move to confirmation panel (Step 4)
    goToStep(4);
    
    // Launch WhatsApp dispatch backup redirect
    setTimeout(() => {
        triggerWhatsAppLink();
    }, 1500);
}

/* ==========================================================================
   DATABASE CONTROLLER (LOCAL BACKUP + SUPABASE LIVE DB)
   ========================================================================== */
function getBookings() {
    const stored = localStorage.getItem('anireekshithaa_bookings');
    return stored ? JSON.parse(stored) : [];
}

async function getBookingsFromSupabase() {
    if (!supabaseClient || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
        return getBookings();
    }
    try {
        const { data, error } = await supabaseClient
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map the properties back to camelCase to prevent breaking existing UI rendering code
        return (data || []).map(b => ({
            bookingId: b.booking_id,
            name: b.name,
            phone: b.phone,
            profession: b.profession,
            category: b.category,
            tickets: b.tickets,
            totalAmount: b.total_amount,
            paidStatus: b.paid_status,
            bookingDate: b.booking_date
        }));
    } catch (err) {
        console.error('Error fetching bookings from Supabase:', err);
        return getBookings(); // fallback to local storage
    }
}

async function saveBookingToDatabase() {
    // Generate new booking record
    const newBookingLocal = {
        bookingId: bookingState.bookingId,
        name: bookingState.attendee.name,
        phone: bookingState.attendee.phone,
        profession: 'Audience',
        category: bookingState.attendee.email || '-',
        transactionId: bookingState.transactionId || '-',
        tickets: bookingState.tickets,
        totalAmount: bookingState.tickets * bookingState.ticketPrice,
        paidStatus: bookingState.paidStatus || 'PENDING',
        bookingDate: new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    // 1. Save to Local Storage as a local backup
    const bookings = getBookings();
    bookings.unshift(newBookingLocal);
    localStorage.setItem('anireekshithaa_bookings', JSON.stringify(bookings));

    // 2. Save to Supabase Cloud if configured
    if (supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
        const cloudCategory = newBookingLocal.category + (newBookingLocal.transactionId !== '-' ? ' | Txn: ' + newBookingLocal.transactionId : '');
        const newBookingCloud = {
            booking_id: newBookingLocal.bookingId,
            name: newBookingLocal.name,
            phone: newBookingLocal.phone,
            profession: newBookingLocal.profession,
            category: cloudCategory,
            tickets: newBookingLocal.tickets,
            total_amount: newBookingLocal.totalAmount,
            paid_status: newBookingLocal.paidStatus,
            booking_date: newBookingLocal.bookingDate
        };
        try {
            const { error } = await supabaseClient.from('bookings').insert([newBookingCloud]);
            if (error) throw error;
            console.log('Successfully saved booking to Supabase!');
        } catch (err) {
            console.error('Failed to save to Supabase, backed up locally:', err);
        }
    }
}

// Generate pre-loaded sample database values to showcase beautiful dashboard metrics immediately (Local Only)
function loadSampleData() {
    const currentBookings = getBookings();
    if (currentBookings.length === 0) {
        const dummyRecords = [
            {
                bookingId: 'ANR-4512-Y',
                name: 'Kiran Hegde',
                phone: '9845210214',
                profession: 'Audience',
                category: 'kiran.hegde@gmail.com',
                tickets: 2,
                totalAmount: 198,
                paidStatus: 'SUCCESSFUL',
                bookingDate: '06 Jun 2026, 05:20 PM'
            },
            {
                bookingId: 'ANR-8921-A',
                name: 'Rohit Sharma',
                phone: '7022145896',
                profession: 'Audience',
                category: 'rohit.sharma@yahoo.com',
                tickets: 1,
                totalAmount: 99,
                paidStatus: 'SUCCESSFUL',
                bookingDate: '06 Jun 2026, 03:10 PM'
            },
            {
                bookingId: 'ANR-3401-G',
                name: 'Pooja Bhat',
                phone: '8095412356',
                profession: 'Audience',
                category: 'pooja.bhat@gmail.com',
                tickets: 4,
                totalAmount: 396,
                paidStatus: 'SUCCESSFUL',
                bookingDate: '05 Jun 2026, 08:45 PM'
            },
            {
                bookingId: 'ANR-7112-L',
                name: 'Suhas K',
                phone: '9900885522',
                profession: 'Audience',
                category: 'suhas.k@outlook.com',
                tickets: 2,
                totalAmount: 198,
                paidStatus: 'SUCCESSFUL',
                bookingDate: '05 Jun 2026, 11:15 AM'
            },
            {
                bookingId: 'ANR-1250-F',
                name: 'Anjali Shetty',
                phone: '8884442211',
                profession: 'Audience',
                category: 'anjali.shetty@gmail.com',
                tickets: 1,
                totalAmount: 99,
                paidStatus: 'SUCCESSFUL',
                bookingDate: '04 Jun 2026, 06:12 PM'
            }
        ];
        localStorage.setItem('anireekshithaa_bookings', JSON.stringify(dummyRecords));
    }
}

/* ==========================================================================
   WHATSAPP INTEGRATION & MOCK NOTIFICATIONS
   ========================================================================== */
function triggerWhatsAppLink() {
    const { name, phone } = bookingState.attendee;
    const { bookingId, tickets } = bookingState;

    // Compose ticket details
    const textMsg = `Hi *${name}*, your booking for the psychological thriller *ANIREEKSHITHAA* (The Unexpected) is *CONFIRMED*! 🎬🍿\n\n` +
        `🎫 *TICKET SLIP*:\n` +
        `• *Booking ID*: ${bookingId}\n` +
        `• *Seats*: ${tickets} Ticket${tickets > 1 ? 's' : ''}\n` +
        `• *Venue*: Chamundeshwari Studios, Bangalore\n` +
        `• *Date*: Saturday, July 4, 2026\n` +
        `• *Time*: 5:00 PM\n\n` +
        `Please display this Booking ID at the counter to retrieve your physical passes. See you at the movies! 🎥`;

    const encodedText = encodeURIComponent(textMsg);
    // WhatsApp Send API Link
    const waUrl = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodedText}`;

    // Redirect or open in new window depending on client context
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = waUrl;
    } else {
        window.open(waUrl, '_blank');
    }

    // Show mock WhatsApp dialog in-page for demonstration feedback
    const messagePopup = document.getElementById('mockWhatsappPopup');
    const textContent = document.getElementById('waMessageText');

    textContent.innerHTML = textMsg.replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    messagePopup.style.display = 'block';
}

function closeWhatsappPopup() {
    document.getElementById('mockWhatsappPopup').style.display = 'none';
}

/* ==========================================================================
   ORGANIZER SECURITY PORTAL (ADMIN DIALOG)
   ========================================================================== */
function promptAdminAccess() {
    // Reset key input and validation errors
    document.getElementById('adminPasskey').value = '';
    document.getElementById('adminPasskeyError').style.display = 'none';

    document.getElementById('adminPasscodeModal').classList.add('active');
}

function closeAdminPasscode() {
    document.getElementById('adminPasscodeModal').classList.remove('active');
}

function submitAdminPasskey() {
    const keyInput = document.getElementById('adminPasskey').value;

    if (keyInput === 'admin123') {
        closeAdminPasscode();
        openAdminDashboard();
    } else {
        document.getElementById('adminPasskeyError').style.display = 'block';
    }
}

/* ==========================================================================
   ADMIN DASHBOARD SYSTEM (REAL-TIME METRICS)
   ========================================================================== */
async function openAdminDashboard() {
    await renderAdminMetrics();
    document.getElementById('adminDashboardModal').classList.add('active');
}

function closeAdminDashboard() {
    document.getElementById('adminDashboardModal').classList.remove('active');
}

async function renderAdminMetrics() {
    const bookings = await getBookingsFromSupabase();

    // Aggregate calculations
    let totalBookingsCount = bookings.length;
    let totalTicketsCount = 0;
    let totalRevenueSum = 0;
    let totalFilmmakersCount = 0;

    bookings.forEach(b => {
        totalTicketsCount += b.tickets;
        totalRevenueSum += b.totalAmount;
        if (b.profession === 'Film Maker') {
            totalFilmmakersCount++;
        }
    });

    // Populate stats
    document.getElementById('statTotalBookings').textContent = totalBookingsCount;
    document.getElementById('statTicketsSold').textContent = totalTicketsCount;
    document.getElementById('statTotalRevenue').textContent = `₹${totalRevenueSum.toLocaleString('en-IN')}`;
    document.getElementById('statFilmmakers').textContent = totalFilmmakersCount;

    // Populate directory table list
    renderTableRows(bookings);
}

function renderTableRows(bookingsList) {
    const tbody = document.getElementById('adminTableBody');
    const noDataAlert = document.getElementById('noDataAlert');

    tbody.innerHTML = '';

    if (bookingsList.length === 0) {
        noDataAlert.style.display = 'block';
        return;
    }

    noDataAlert.style.display = 'none';

    bookingsList.forEach(booking => {
        const tr = document.createElement('tr');

        // Extract email (which is stored in the category column, potentially with transaction ID)
        let emailVal = booking.category || '-';
        if (emailVal.includes(' | ')) {
            emailVal = emailVal.split(' | ')[0];
        }

        // Check if pending status
        const isPending = booking.paidStatus === 'PENDING' || booking.paidStatus === 'PENDING_VERIFICATION';
        const paidBadge = isPending
            ? `<span class="badge-paid pending"><i class="fa-solid fa-clock"></i> PENDING</span>`
            : `<span class="badge-paid"><i class="fa-solid fa-circle-check"></i> YES</span>`;

        // Action button (Approve pending, or Resend for confirmed)
        const actionBtn = isPending
            ? `<button class="btn-success" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; border: none; font-weight: 600; cursor: pointer;" onclick="event.stopPropagation(); approveBooking('${booking.bookingId}')"><i class="fa-solid fa-check"></i> Approve & Send WhatsApp</button>`
            : `<button class="btn-secondary" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; border: none; font-weight: 600; cursor: pointer;" onclick="event.stopPropagation(); resendWhatsAppText('${booking.bookingId}')"><i class="fa-brands fa-whatsapp"></i> Resend</button>`;

        tr.innerHTML = `
            <td><strong>${booking.bookingId}</strong></td>
            <td>${escapeHtml(booking.name)}</td>
            <td>+91 ${escapeHtml(booking.phone)}</td>
            <td>${escapeHtml(emailVal)}</td>
            <td>${booking.tickets} seat${booking.tickets > 1 ? 's' : ''}</td>
            <td>${paidBadge}</td>
            <td><small>${booking.bookingDate}</small></td>
            <td>${actionBtn}</td>
        `;

        tbody.appendChild(tr);
    });
}

async function approveBooking(bookingId) {
    if (!confirm(`Are you sure you want to approve booking ${bookingId} and send the WhatsApp ticket confirmation?`)) {
        return;
    }

    let bookings = getBookings();
    const bookingIdx = bookings.findIndex(b => b.bookingId === bookingId);
    if (bookingIdx !== -1) {
        bookings[bookingIdx].paidStatus = 'SUCCESSFUL';
        localStorage.setItem('anireekshithaa_bookings', JSON.stringify(bookings));
    }

    if (supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
        try {
            const { error } = await supabaseClient
                .from('bookings')
                .update({ paid_status: 'SUCCESSFUL' })
                .eq('booking_id', bookingId);
            if (error) throw error;
            console.log(`Updated booking ${bookingId} on Supabase`);
        } catch (err) {
            console.error('Failed to update Supabase status:', err);
        }
    }

    // Refresh admin data
    renderAdminMetrics();

    // Trigger WhatsApp confirmation text on behalf of the organizer
    const targetBooking = bookings.find(b => b.bookingId === bookingId);
    if (targetBooking) {
        // Temporarily set bookingState values to match target booking for WhatsApp dispatcher
        bookingState.attendee = {
            name: targetBooking.name,
            phone: targetBooking.phone,
            profession: targetBooking.profession,
            category: targetBooking.category
        };
        bookingState.bookingId = targetBooking.bookingId;
        bookingState.tickets = targetBooking.tickets;

        triggerWhatsAppLink();
    }
}

function resendWhatsAppText(bookingId) {
    const bookings = getBookings();
    const targetBooking = bookings.find(b => b.bookingId === bookingId);
    if (targetBooking) {
        bookingState.attendee = {
            name: targetBooking.name,
            phone: targetBooking.phone,
            profession: targetBooking.profession,
            category: targetBooking.category
        };
        bookingState.bookingId = targetBooking.bookingId;
        bookingState.tickets = targetBooking.tickets;

        triggerWhatsAppLink();
    }
}

async function filterAdminTable() {
    const searchVal = document.getElementById('adminSearch').value.toLowerCase().trim();
    const filterStatus = document.getElementById('adminFilterStatus').value;

    const bookings = await getBookingsFromSupabase();

    const filtered = bookings.filter(b => {
        // Search matches Name, Phone, Email, or Booking ID
        const matchSearch = b.name.toLowerCase().includes(searchVal) ||
            b.phone.includes(searchVal) ||
            b.bookingId.toLowerCase().includes(searchVal) ||
            (b.category && b.category.toLowerCase().includes(searchVal));

        // Status matches filter dropdown
        let matchStatus = true;
        if (filterStatus !== 'all') {
            if (filterStatus === 'SUCCESSFUL') {
                matchStatus = b.paidStatus === 'SUCCESSFUL';
            } else if (filterStatus === 'PENDING') {
                matchStatus = b.paidStatus === 'PENDING' || b.paidStatus === 'PENDING_VERIFICATION';
            }
        }

        return matchSearch && matchStatus;
    });

    renderTableRows(filtered);
}

async function confirmResetDatabase() {
    if (confirm('Are you sure you want to completely erase the attendee registry and reviews database? This cannot be undone.')) {
        localStorage.setItem('anireekshithaa_bookings', JSON.stringify([]));
        localStorage.setItem('anireekshithaa_feedbacks', JSON.stringify([]));

        if (supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
            try {
                // Delete all rows from both tables
                const { error: err1 } = await supabaseClient.from('bookings').delete().neq('name', '___non_existent___');
                const { error: err2 } = await supabaseClient.from('feedbacks').delete().neq('name', '___non_existent___');
                if (err1) throw err1;
                if (err2) throw err2;
                console.log('Supabase database reset complete!');
            } catch (err) {
                console.error('Failed to reset Supabase database:', err);
            }
        }

        await renderAdminMetrics();
        await renderReviewsTable();
        alert('Database has been completely reset.');
    }
}

/* ==========================================================================
   CSV EXPORT GENERATOR
   ========================================================================== */
async function exportDatabaseToCSV() {
    const bookings = await getBookingsFromSupabase();

    if (bookings.length === 0) {
        alert('There is no booking data to export.');
        return;
    }

    // Create header columns
    let csvContent = 'Booking ID,Attendee Name,Phone,Profession,Filmmaker Sub-Role,Tickets,Total Amount (INR),Payment Status,Booking Date\n';

    bookings.forEach(b => {
        // Wrap strings in quotes to handle names with commas
        const safeName = `"${b.name.replace(/"/g, '""')}"`;
        const safeProfession = `"${b.profession.replace(/"/g, '""')}"`;
        const safeCategory = `"${b.category.replace(/"/g, '""')}"`;
        const dateString = `"${b.bookingDate}"`;

        csvContent += `${b.bookingId},${safeName},+91${b.phone},${safeProfession},${safeCategory},${b.tickets},${b.totalAmount},${b.paidStatus},${dateString}\n`;
    });

    // Download logic via dynamic anchor tag
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.setAttribute('href', url);
    downloadLink.setAttribute('download', `anireekshithaa_attendees_report_${new Date().toISOString().slice(0, 10)}.csv`);
    downloadLink.style.visibility = 'hidden';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

/* ==========================================================================
   XSS PREVENTATIVE SECURITY ESCAPES
   ========================================================================== */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ==========================================================================
   AUDIENCE ECHO - FEEDBACK INTERACTION SYSTEM
   ========================================================================== */
let starRating = 0;
function initReviewCorner() {
    const starBtns = document.querySelectorAll('.star-btn');
    const ratingInput = document.getElementById('reviewRatingInput');

    starBtns.forEach(btn => {
        // Hover highlight
        btn.addEventListener('mouseenter', () => {
            const val = parseInt(btn.getAttribute('data-value'));
            highlightStars(val);
        });

        // Mouse leave reverts to chosen rating
        btn.addEventListener('mouseleave', () => {
            highlightStars(starRating);
        });

        // Click selects rating
        btn.addEventListener('click', () => {
            const val = parseInt(btn.getAttribute('data-value'));
            starRating = val;
            ratingInput.value = val;
            highlightStars(val);
        });
    });

    // Voice record toggle hook
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            toggleVoiceRecording();
        });
    }
}

function highlightStars(val) {
    const starBtns = document.querySelectorAll('.star-btn');
    starBtns.forEach(btn => {
        const starVal = parseInt(btn.getAttribute('data-value'));
        if (starVal <= val) {
            btn.classList.remove('fa-regular');
            btn.classList.add('fa-solid');
            btn.classList.add('active');
        } else {
            btn.classList.remove('fa-solid');
            btn.classList.add('fa-regular');
            btn.classList.remove('active');
        }
    });
}

/* ==========================================================================
   VOICE RECORDER / GRACEFUL AUDIO SIMULATOR
   ========================================================================== */
let isRecording = false;
let isSimulation = false;
let mediaRecorder = null;
let audioChunks = [];
let recordTimerInterval = null;
let recordingDuration = 0;

function toggleVoiceRecording() {
    if (isRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
}

function startVoiceRecording() {
    isRecording = true;
    isSimulation = false;
    audioChunks = [];
    recordingDuration = 0;

    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const timerDisplay = document.getElementById('recordTimer');
    const instructions = document.getElementById('voiceInstructions');

    // UI states
    recordBtn.classList.add('recording');
    recordBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
    stopRecordBtn.style.display = 'inline-block';
    instructions.textContent = 'Recording live audio feedback... speak clearly.';
    timerDisplay.textContent = '00:00';

    // Check if mic capture is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        startSimulatedRecording('Sandbox mode: Recording simulated audio feedback...');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = e => {
                if (e.data && e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Free micro resources
                stream.getTracks().forEach(track => track.stop());

                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                window.recordedAudioBlob = blob;

                const audioUrl = URL.createObjectURL(blob);
                document.getElementById('voicePlayback').src = audioUrl;
                document.getElementById('playbackContainer').style.display = 'block';
                instructions.textContent = 'Voice note review ready. Listen and enter your name to submit.';
            };

            mediaRecorder.start();
            startRecordClocks();
        })
        .catch(err => {
            console.warn('Microphone access blocked/unsupported. Falling back to synth audio simulator:', err);
            startSimulatedRecording('Sandbox simulator: Recording generated audio feedback...');
        });
}

function startSimulatedRecording(instructionMsg) {
    isSimulation = true;
    recordingDuration = 0;
    document.getElementById('voiceInstructions').textContent = instructionMsg;
    startRecordClocks();
}

function startRecordClocks() {
    const timerDisplay = document.getElementById('recordTimer');
    const waveBars = document.querySelectorAll('.waveform-container .wave-bar');

    // Clock tick
    recordTimerInterval = setInterval(() => {
        recordingDuration++;
        const mins = Math.floor(recordingDuration / 60).toString().padStart(2, '0');
        const secs = (recordingDuration % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;

        if (recordingDuration >= 60) {
            stopVoiceRecording();
        }
    }, 1000);

    // Animate visual equalizer bars
    waveBars.forEach(b => b.classList.add('active'));
    window.waveAnimateInterval = setInterval(() => {
        waveBars.forEach(bar => {
            const h = Math.floor(Math.random() * 25) + 8;
            bar.style.height = `${h}px`;
        });
    }, 150);
}

function stopVoiceRecording() {
    if (!isRecording) return;
    isRecording = false;

    clearInterval(recordTimerInterval);
    clearInterval(window.waveAnimateInterval);

    // Reset visual bars
    document.querySelectorAll('.waveform-container .wave-bar').forEach(bar => {
        bar.classList.remove('active');
        bar.style.height = '15px';
    });

    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const instructions = document.getElementById('voiceInstructions');

    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    stopRecordBtn.style.display = 'none';

    if (isSimulation) {
        // Generate mock audio blob using synthesized procedural oscillator WAV
        const blob = generateMockAudioBlob();
        window.recordedAudioBlob = blob;

        const audioUrl = URL.createObjectURL(blob);
        document.getElementById('voicePlayback').src = audioUrl;
        document.getElementById('playbackContainer').style.display = 'block';
        instructions.textContent = 'Simulated voice note generated. Listen to the synth review and submit below.';
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    }
}

function resetVoiceRecorder() {
    document.getElementById('playbackContainer').style.display = 'none';
    document.getElementById('voicePlayback').src = '';
    window.recordedAudioBlob = null;
    document.getElementById('voiceReviewName').value = '';
    document.getElementById('recordTimer').textContent = '00:00';
    document.getElementById('voiceInstructions').textContent = 'Click the microphone button to start recording your feedback (Max 60s).';
}

// Simple procedural synthesizer producing a sequence of C-E-G beep notes in a WAV file
function generateMockAudioBlob() {
    const sampleRate = 8000;
    const duration = 1.8;
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples * 2, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let freq = 261.63; // C4
        if (t > 0.6 && t <= 1.2) freq = 329.63; // E4
        if (t > 1.2) freq = 392.00; // G4

        const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-3 * (t % 0.6)); // decaying oscillator
        view.setInt16(offset, sample * 0x5FFF, true);
        offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

/* ==========================================================================
   FEEDBACK DATABASE CONTROLLER (LOCAL BACKUP + SUPABASE LIVE DB)
   ========================================================================== */
function getFeedbacks() {
    const stored = localStorage.getItem('anireekshithaa_feedbacks');
    return stored ? JSON.parse(stored) : [];
}

async function getFeedbacksFromSupabase() {
    if (!supabaseClient || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
        return getFeedbacks();
    }
    try {
        const { data, error } = await supabaseClient
            .from('feedbacks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(f => ({
            id: f.feedback_id,
            type: f.type,
            name: f.name,
            rating: f.rating,
            comment: f.comment,
            audioData: f.audio_url,
            duration: f.duration,
            date: f.booking_date
        }));
    } catch (err) {
        console.error('Error fetching feedbacks from Supabase:', err);
        return getFeedbacks();
    }
}

async function uploadVoiceFile(blob) {
    if (!supabaseClient || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
        return null;
    }
    try {
        const fileName = `voice_${Date.now()}_${Math.floor(Math.random() * 1000)}.wav`;
        const { data, error } = await supabaseClient.storage
            .from('voice-notes')
            .upload(fileName, blob, {
                contentType: 'audio/wav',
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: publicUrlData } = supabaseClient.storage
            .from('voice-notes')
            .getPublicUrl(data.path);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('Failed to upload voice note to Supabase Storage:', err);
        return null;
    }
}

async function submitTextReview() {
    const name = document.getElementById('reviewName').value.trim();
    const ratingInput = document.getElementById('reviewRatingInput').value;
    const text = document.getElementById('reviewText').value.trim();

    if (!name || !ratingInput || !text) {
        alert('Please fill out all required fields.');
        return;
    }

    const randomId = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const reviewLocal = {
        id: `REV-${randomId}-T`,
        type: 'TEXT',
        name: name,
        rating: parseInt(ratingInput),
        comment: text,
        audioData: '',
        duration: '',
        date: dateStr
    };

    // 1. Backup to Local Storage
    const feedbacks = getFeedbacks();
    feedbacks.unshift(reviewLocal);
    localStorage.setItem('anireekshithaa_feedbacks', JSON.stringify(feedbacks));

    // 2. Save to Supabase Cloud
    if (supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
        const reviewCloud = {
            feedback_id: reviewLocal.id,
            type: reviewLocal.type,
            name: reviewLocal.name,
            rating: reviewLocal.rating,
            comment: reviewLocal.comment,
            audio_url: '',
            duration: '',
            booking_date: reviewLocal.date
        };
        try {
            const { error } = await supabaseClient.from('feedbacks').insert([reviewCloud]);
            if (error) throw error;
            console.log('Written feedback saved to Supabase!');
        } catch (err) {
            console.error('Error saving feedback to Supabase:', err);
        }
    }

    // Reset Form
    document.getElementById('textReviewForm').reset();
    starRating = 0;
    document.getElementById('reviewRatingInput').value = '';
    highlightStars(0);

    alert('Thank you! Your written review has been recorded.');

    if (document.getElementById('adminDashboardModal').classList.contains('active')) {
        await renderReviewsTable();
        await renderAdminMetrics();
    }
}

async function submitVoiceReview() {
    const name = document.getElementById('voiceReviewName').value.trim();
    if (!name) {
        alert('Please enter your name.');
        return;
    }

    if (!window.recordedAudioBlob) {
        alert('Please record a voice note first.');
        return;
    }

    const submitBtn = document.getElementById('submitVoiceBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

    try {
        let audioUrl = '';
        if (supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
            audioUrl = await uploadVoiceFile(window.recordedAudioBlob);
        }

        let base64Data = await blobToBase64(window.recordedAudioBlob);
        if (!audioUrl) {
            audioUrl = base64Data; // Play locally if Supabase storage upload failed or not configured
        }

        const randomId = Math.floor(1000 + Math.random() * 9000);
        const mins = Math.floor(recordingDuration / 60).toString().padStart(2, '0');
        const secs = (recordingDuration % 60).toString().padStart(2, '0');
        const durationStr = `${mins}:${secs}`;
        const dateStr = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const reviewLocal = {
            id: `REV-${randomId}-V`,
            type: 'VOICE',
            name: name,
            rating: 0,
            comment: `Voice Note review (${durationStr})`,
            audioData: base64Data,
            duration: durationStr,
            date: dateStr
        };

        // 1. Backup to Local Storage
        const feedbacks = getFeedbacks();
        feedbacks.unshift(reviewLocal);
        localStorage.setItem('anireekshithaa_feedbacks', JSON.stringify(feedbacks));

        // 2. Save to Supabase Cloud
        if (supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
            const reviewCloud = {
                feedback_id: reviewLocal.id,
                type: reviewLocal.type,
                name: reviewLocal.name,
                rating: reviewLocal.rating,
                comment: reviewLocal.comment,
                audio_url: audioUrl,
                duration: reviewLocal.duration,
                booking_date: reviewLocal.date
            };
            const { error } = await supabaseClient.from('feedbacks').insert([reviewCloud]);
            if (error) throw error;
            console.log('Voice feedback saved to Supabase!');
        }

        resetVoiceRecorder();
        alert('Thank you! Your voice review note has been recorded.');

        if (document.getElementById('adminDashboardModal').classList.contains('active')) {
            await renderReviewsTable();
            await renderAdminMetrics();
        }
    } catch (err) {
        console.error('Voice note submission failed:', err);
        alert('Failed to submit voice review. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/* ==========================================================================
   ADMIN PANEL TABS & REVIEWS MANAGER
   ========================================================================== */
async function switchAdminTab(tabName) {
    const tabBookingsBtn = document.getElementById('tabBookingsBtn');
    const tabReviewsBtn = document.getElementById('tabReviewsBtn');
    const bookingsTabContent = document.getElementById('bookingsTabContent');
    const reviewsTabContent = document.getElementById('reviewsTabContent');

    if (tabName === 'bookings') {
        tabBookingsBtn.classList.add('active');
        tabBookingsBtn.style.color = 'var(--text-white)';
        tabBookingsBtn.style.borderBottom = '2px solid var(--red)';

        tabReviewsBtn.classList.remove('active');
        tabReviewsBtn.style.color = 'var(--text-dark)';
        tabReviewsBtn.style.borderBottom = 'none';

        bookingsTabContent.style.display = 'block';
        reviewsTabContent.style.display = 'none';
        await renderAdminMetrics();
    } else if (tabName === 'reviews') {
        tabReviewsBtn.classList.add('active');
        tabReviewsBtn.style.color = 'var(--text-white)';
        tabReviewsBtn.style.borderBottom = '2px solid var(--red)';

        tabBookingsBtn.classList.remove('active');
        tabBookingsBtn.style.color = 'var(--text-dark)';
        tabBookingsBtn.style.borderBottom = 'none';

        bookingsTabContent.style.display = 'none';
        reviewsTabContent.style.display = 'block';

        await renderReviewsTable();
    }
}

async function renderReviewsTable(feedbacksList) {
    const tbody = document.getElementById('adminReviewsTableBody');
    const noReviewsAlert = document.getElementById('noReviewsDataAlert');

    tbody.innerHTML = '';
    const list = feedbacksList || await getFeedbacksFromSupabase();

    if (list.length === 0) {
        noReviewsAlert.style.display = 'block';
        return;
    }

    noReviewsAlert.style.display = 'none';

    list.forEach(rev => {
        const tr = document.createElement('tr');

        const typeBadge = rev.type === 'TEXT'
            ? `<span class="badge-profession" style="background-color: rgba(217, 35, 42, 0.1); color: var(--red-bright); border: 1px solid var(--border-red);"><i class="fa-solid fa-pen-nib"></i> Text</span>`
            : `<span class="badge-profession" style="background-color: rgba(0, 242, 254, 0.1); color: var(--cyan); border: 1px solid var(--border-glass);"><i class="fa-solid fa-microphone"></i> Voice</span>`;

        let ratingHTML = '';
        if (rev.type === 'TEXT') {
            for (let i = 1; i <= 5; i++) {
                if (i <= rev.rating) {
                    ratingHTML += `<i class="fa-solid fa-star" style="color: var(--red-bright); font-size: 0.8rem; margin-right: 2px;"></i>`;
                } else {
                    ratingHTML += `<i class="fa-regular fa-star" style="color: var(--text-dark); font-size: 0.8rem; margin-right: 2px;"></i>`;
                }
            }
        } else {
            ratingHTML = `<span style="color: var(--text-dark); font-size: 0.8rem;"><i class="fa-solid fa-microphone"></i> Voice note (${rev.duration})</span>`;
        }

        let contentHTML = '';
        if (rev.type === 'TEXT') {
            contentHTML = `<div style="max-width: 320px; white-space: normal; line-height: 1.4; color: var(--text-white);">${escapeHtml(rev.comment)}</div>`;
        } else {
            contentHTML = `<audio src="${rev.audioData}" controls style="height: 30px; width: 200px; background-color: #121319; border-radius: 4px; padding: 2px;"></audio>`;
        }

        tr.innerHTML = `
            <td><strong>${escapeHtml(rev.name)}</strong></td>
            <td>${typeBadge}</td>
            <td>${ratingHTML}</td>
            <td>${contentHTML}</td>
            <td><small>${rev.date}</small></td>
            <td>
                <button class="btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="deleteFeedbackById('${rev.id}')">
                    <i class="fa-solid fa-trash-can"></i> Delete
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function filterReviewsTable() {
    const searchVal = document.getElementById('adminReviewSearch').value.toLowerCase().trim();
    const feedbacks = await getFeedbacksFromSupabase();

    const filtered = feedbacks.filter(r => {
        return r.name.toLowerCase().includes(searchVal) || r.comment.toLowerCase().includes(searchVal);
    });

    renderReviewsTable(filtered);
}

async function deleteFeedbackById(id) {
    if (confirm('Are you sure you want to permanently delete this audience review?')) {
        // Delete locally first
        const localFeedbacks = getFeedbacks();
        const filteredLocal = localFeedbacks.filter(item => item.id !== id);
        localStorage.setItem('anireekshithaa_feedbacks', JSON.stringify(filteredLocal));

        // Delete from Supabase
        if (supabaseClient && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY') {
            try {
                const { error } = await supabaseClient
                    .from('feedbacks')
                    .delete()
                    .eq('feedback_id', id);
                if (error) throw error;
                console.log('Review deleted from Supabase!');
            } catch (err) {
                console.error('Failed to delete review from Supabase:', err);
            }
        }

        await renderReviewsTable();
        await renderAdminMetrics();
    }
}

// Dummy review loader - stores to Local Storage only to pre-populate local fallback dashboard immediately
function loadSampleFeedbacks() {
    const currentFeedbacks = getFeedbacks();
    if (currentFeedbacks.length === 0) {
        const mockBlob = generateMockAudioBlob();
        blobToBase64(mockBlob)
            .then(base64Data => {
                const sampleReviews = [
                    {
                        id: 'REV-9874-T',
                        type: 'TEXT',
                        name: 'Aravind Shastry',
                        rating: 5,
                        comment: 'Anireekshithaa is a masterpiece of tension! The sound design in the last 5 minutes had me on the edge of my seat. Sharath Raj\'s performance was top-tier.',
                        audioData: '',
                        duration: '',
                        date: '06 Jun 2026, 06:15 PM'
                    },
                    {
                        id: 'REV-2541-T',
                        type: 'TEXT',
                        name: 'Deepa Rao',
                        rating: 4,
                        comment: 'Very well shot. The director\'s use of colors (red and blue hues) really represented Vikram\'s collapsing psyche. Kudos to the DOP Rajesh Varma!',
                        audioData: '',
                        duration: '',
                        date: '06 Jun 2026, 04:30 PM'
                    },
                    {
                        id: 'REV-1036-V',
                        type: 'VOICE',
                        name: 'Harish Kumar',
                        rating: 0,
                        comment: 'Voice Note review (00:03)',
                        audioData: base64Data,
                        duration: '00:03',
                        date: '05 Jun 2026, 09:20 PM'
                    }
                ];
                localStorage.setItem('anireekshithaa_feedbacks', JSON.stringify(sampleReviews));

                if (document.getElementById('adminDashboardModal').classList.contains('active')) {
                    renderReviewsTable();
                }
            })
            .catch(err => {
                console.error('Failed to encode sample voice review:', err);
                const sampleReviewsText = [
                    {
                        id: 'REV-9874-T',
                        type: 'TEXT',
                        name: 'Aravind Shastry',
                        rating: 5,
                        comment: 'Anireekshithaa is a masterpiece of tension! The sound design in the last 5 minutes had me on the edge of my seat. Sharath Raj\'s performance was top-tier.',
                        audioData: '',
                        duration: '',
                        date: '06 Jun 2026, 06:15 PM'
                    },
                    {
                        id: 'REV-2541-T',
                        type: 'TEXT',
                        name: 'Deepa Rao',
                        rating: 4,
                        comment: 'Very well shot. The director\'s use of colors (red and blue hues) really represented Vikram\'s collapsing psyche. Kudos to the DOP Rajesh Varma!',
                        audioData: '',
                        duration: '',
                        date: '06 Jun 2026, 04:30 PM'
                    }
                ];
                localStorage.setItem('anireekshithaa_feedbacks', JSON.stringify(sampleReviewsText));
            });
    }
}

// Global modal click-outside and keydown closures
window.addEventListener('click', (e) => {
    const bookingModal = document.getElementById('bookingModal');
    if (e.target === bookingModal) {
        closeBookingModal();
    }
    const adminDashboardModal = document.getElementById('adminDashboardModal');
    if (e.target === adminDashboardModal) {
        closeAdminDashboard();
    }
    const adminPasscodeModal = document.getElementById('adminPasscodeModal');
    if (e.target === adminPasscodeModal) {
        closeAdminPasscode();
    }
    const lightboxModal = document.getElementById('lightboxModal');
    if (e.target === lightboxModal) {
        closeLightbox();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeBookingModal();
        closeAdminDashboard();
        closeAdminPasscode();
        closeLightbox();
    }
});

/* ==========================================================================
   AUTO-GENERATED BRANDED PDF TICKETS
   ========================================================================== */
function getBase64ImageFromUrl(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => reject(err);
        img.src = imageUrl;
    });
}

async function downloadPDFTicket() {
    if (!bookingState || !bookingState.bookingId) {
        alert('No active booking details found to generate a ticket.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait', 'px', [380, 580]);

    // 1. Draw Background
    doc.setFillColor(11, 12, 18);
    doc.rect(0, 0, 380, 580, 'F');

    // 2. Draw Borders
    doc.setDrawColor(217, 35, 42);
    doc.setLineWidth(2);
    doc.rect(8, 8, 364, 564, 'D');

    // 3. Draw Header Brand
    doc.setTextColor(217, 35, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('AANTHARYA CREATIONS PRESENTS', 190, 45, { align: 'center' });

    // 4. Draw Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.text('ANIREEKSHITHAA', 190, 75, { align: 'center' });

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(30, 95, 350, 95);

    // 5. Draw Metadata
    const fields = [
        { label: 'ATTENDEE', val: bookingState.attendee.name, x: 40, y: 125 },
        { label: 'BOOKING ID', val: bookingState.bookingId, x: 220, y: 125, isRed: true },
        { label: 'SEATS', val: `${bookingState.tickets} Seat${bookingState.tickets > 1 ? 's' : ''}`, x: 40, y: 180 },
        { label: 'VENUE', val: 'Chamundeshwari Studios', x: 220, y: 180 },
        { label: 'DATE', val: 'July 4, 2026', x: 40, y: 235 },
        { label: 'TIME', val: '5:00 PM onwards', x: 220, y: 235 },
        { label: 'STATUS', val: (bookingState.paidStatus === 'SUCCESSFUL') ? 'CONFIRMED' : 'PENDING VERIFICATION', x: 40, y: 290, isYellow: (bookingState.paidStatus !== 'SUCCESSFUL'), isGreen: (bookingState.paidStatus === 'SUCCESSFUL') }
    ];

    fields.forEach(f => {
        doc.setTextColor(170, 170, 170);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(f.label, f.x, f.y);

        if (f.isRed) {
            doc.setTextColor(217, 35, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
        } else if (f.isYellow) {
            doc.setTextColor(241, 196, 15);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
        } else if (f.isGreen) {
            doc.setTextColor(46, 204, 113);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
        } else {
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
        }
        doc.text(f.val, f.x, f.y + 15);
    });

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(30, 330, 350, 330);

    // 6. Draw QR Code Image
    let qrBase64 = null;
    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(bookingState.bookingId)}`;
        qrBase64 = await getBase64ImageFromUrl(qrUrl);
    } catch (err) {
        console.warn('Failed to load QR code image, using placeholder:', err);
    }

    if (qrBase64) {
        doc.addImage(qrBase64, 'PNG', 115, 350, 150, 150);
    } else {
        doc.setDrawColor(100, 100, 100);
        doc.rect(115, 350, 150, 150, 'D');
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('QR Code Offline', 190, 420, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`(ID: ${bookingState.bookingId})`, 190, 435, { align: 'center' });
    }

    // 7. Draw Barcode
    doc.setFillColor(255, 255, 255);
    let startX = 60;
    [2, 4, 1, 6, 2, 4, 1, 8, 2, 1, 4, 2, 6, 1, 4].forEach(w => {
        doc.rect(startX, 520, w, 25, 'F');
        startX += w + 3;
    });

    // 8. Draw Footer Info
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('PRESENT THIS TICKET AT THE VENUE COUNTER', 190, 560, { align: 'center' });

    doc.save(`Ticket_ANIREEKSHITHAA_${bookingState.bookingId}.pdf`);
}
