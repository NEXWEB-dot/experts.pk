/**
 * Cloudflare Pages Function: /api/send-order-email
 * Sends customer order confirmation and admin alert via Resend API
 */

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Parse JSON payload from checkout.js
    const body = await request.json();

    const resendApiKey = env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not configured');
      return new Response(JSON.stringify({
        error: 'RESEND_API_KEY environment variable is missing on Cloudflare Pages.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Default to verified sender and configured admin
    const fromEmail = env.RESEND_FROM_EMAIL || 'Expert Services <orders@experts.com.pk>';
    const adminEmail = env.STORE_ADMIN_EMAIL || 'tostdygstgk@gmail.com';

    // Format timestamps for PKT
    const now = new Date();
    const dateOptions = { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' };
    const timeOptions = { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true };
    const dateStr = new Intl.DateTimeFormat('en-PK', dateOptions).format(now);
    const timeStr = new Intl.DateTimeFormat('en-PK', timeOptions).format(now);

    const subtotalFormatted = (body.subtotal || 0).toLocaleString('en-PK');
    const totalFormatted = (body.total || 0).toLocaleString('en-PK');
    const shippingText = body.shipping?.text || 'Free Delivery';
    const phoneDigits = (body.phone || '').replace(/\D/g, '').replace(/^0+/, '');

    const paymentLabels = {
      cod: 'Cash on Delivery (COD)',
      easypaisa: 'Easypaisa',
      jazzcash: 'JazzCash',
      bank: 'Bank Transfer'
    };
    const paymentDisplay = paymentLabels[body.payment] || 'Cash on Delivery';

    // Helper: Resend API Dispatch
    async function sendViaResend(toAddress, subject, htmlContent) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toAddress.trim()],
            subject: subject,
            html: htmlContent
          })
        });

        const data = await resp.json();
        if (!resp.ok) {
          console.error(`Resend API failed (${resp.status}) for ${toAddress}:`, data);
          return { success: false, status: resp.status, error: data };
        }
        return { success: true, id: data.id };
      } catch (err) {
        console.error(`Network error calling Resend for ${toAddress}:`, err);
        return { success: false, error: err.message };
      }
    }

    // -----------------------------------------------------------------
    // 1. Build Customer Email HTML
    // -----------------------------------------------------------------
    function buildCustomerHtml() {
      const itemsHtml = (body.cart || []).map(item => `
        <table width="100%" style="margin-bottom:0; border-collapse:collapse;">
          <tr>
            <td style="padding:14px 0; border-bottom:1px solid #f0f0f5;">
              <div style="font-size:14px; font-weight:600; color:#111111; margin-bottom:3px;">${item.name}</div>
              <div style="font-size:12px; color:#888888;">
                ${item.color ? `Color: ${item.color} &nbsp;&middot;&nbsp; ` : ''}
                Qty: ${item.qty}
              </div>
            </td>
            <td style="padding:14px 0 14px 16px; border-bottom:1px solid #f0f0f5; text-align:right; white-space:nowrap;">
              <div style="font-size:14px; font-weight:700; color:#111111;">PKR ${(item.price * item.qty).toLocaleString('en-PK')}</div>
            </td>
          </tr>
        </table>
      `).join('');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${body.orderId || ''}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background-color:#f2f2f5; font-family:'Segoe UI', Helvetica, Arial, sans-serif; color:#333333; }
    table { border-collapse:collapse; width:100%; }
    .email-wrap { max-width:600px; margin:0 auto; padding:30px 15px; }
    .hdr { background:#111111; border-radius:14px 14px 0 0; padding:28px 30px; text-align:center; }
    .hdr-logo { font-family:'Courier New', monospace; font-size:20px; font-weight:700; letter-spacing:3px; color:#ffffff; }
    .hdr-logo span { color:#fabe1a; }
    .hero { background:linear-gradient(135deg, #fabe1a 0%, #f5aa00 100%); padding:30px 30px; text-align:center; }
    .hero h1 { font-size:24px; font-weight:800; color:#111111; margin-bottom:6px; }
    .hero p { font-size:14px; color:#222222; }
    .card { background:#ffffff; padding:32px 30px; }
    .order-ref { background:#fafafa; border:1px solid #e5e5f0; border-radius:10px; padding:18px 20px; margin-bottom:24px; }
    .ref-id { font-family:'Courier New', monospace; font-size:20px; font-weight:700; color:#fabe1a; }
    .sec-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#888888; padding-bottom:8px; border-bottom:2px solid #f0f0f5; margin-bottom:14px; }
    .totals-box { background:#fafafa; border:1px solid #eeeeee; border-radius:10px; padding:16px 20px; margin:20px 0; }
    .totals-row { display:flex; justify-content:space-between; font-size:13px; color:#666666; padding:6px 0; }
    .totals-row.final { border-top:1px solid #e5e5f0; padding-top:10px; margin-top:4px; font-size:16px; font-weight:700; color:#111111; }
    .totals-row.final span:last-child { color:#fabe1a; }
    .delivery-box { background:#fafafa; border:1px solid #eeeeee; border-radius:10px; padding:16px 20px; margin-bottom:20px; font-size:13px; line-height:1.6; }
    .ftr { background:#111111; border-radius:0 0 14px 14px; padding:22px 30px; text-align:center; color:#777777; font-size:11px; line-height:1.6; }
  </style>
</head>
<body>
  <div class="email-wrap">
    <div class="hdr">
      <div class="hdr-logo">EXPERT<span>.</span>SERVICES</div>
    </div>
    <div class="hero">
      <h1>✓ Order Confirmed!</h1>
      <p>Thank you for shopping with Experts Store.</p>
    </div>
    <div class="card">
      <div class="order-ref">
        <table width="100%">
          <tr>
            <td>
              <div style="font-size:11px; color:#888; text-transform:uppercase;">Order ID</div>
              <div class="ref-id">${body.orderId || ''}</div>
            </td>
            <td style="text-align:right; font-size:12px; color:#888;">
              ${dateStr}<br>${timeStr} PKT
            </td>
          </tr>
        </table>
      </div>

      <div class="sec-title">Order Items</div>
      ${itemsHtml}

      <div class="totals-box">
        <table width="100%">
          <tr>
            <td style="font-size:13px; color:#666; padding:4px 0;">Subtotal</td>
            <td style="font-size:13px; color:#333; text-align:right; padding:4px 0;">PKR ${subtotalFormatted}</td>
          </tr>
          <tr>
            <td style="font-size:13px; color:#666; padding:4px 0;">Delivery</td>
            <td style="font-size:13px; color:#333; text-align:right; padding:4px 0;">${shippingText}</td>
          </tr>
          <tr>
            <td style="font-size:13px; color:#666; padding:4px 0;">Payment Method</td>
            <td style="font-size:13px; color:#333; text-align:right; padding:4px 0;">${paymentDisplay}</td>
          </tr>
          <tr>
            <td style="font-size:16px; font-weight:700; color:#111; padding-top:10px; border-top:1px solid #e5e5f0;">Total Amount</td>
            <td style="font-size:16px; font-weight:700; color:#fabe1a; text-align:right; padding-top:10px; border-top:1px solid #e5e5f0;">PKR ${totalFormatted}</td>
          </tr>
        </table>
      </div>

      <div class="sec-title">Delivery Address</div>
      <div class="delivery-box">
        <strong>${body.name || 'Customer'}</strong><br>
        Phone: ${body.phone || 'N/A'}<br>
        Address: ${body.address || ''}, ${body.city || ''}
      </div>

      <div style="text-align:center; margin-top:24px;">
        <a href="https://wa.me/923332240559?text=${encodeURIComponent('Hi Expert Services, I have a question about my order ' + (body.orderId || ''))}" style="display:inline-block; background:#25D366; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:99px; font-weight:700; font-size:13px;">Need Help? Contact on WhatsApp</a>
      </div>
    </div>
    <div class="ftr">
      Expert Services &copy; 2026. All rights reserved.<br>
      Karachi, Pakistan &bull; <a href="https://experts.com.pk" style="color:#fabe1a; text-decoration:none;">experts.com.pk</a>
    </div>
  </div>
</body>
</html>`;
    }

    // -----------------------------------------------------------------
    // 2. Build Admin Email HTML
    // -----------------------------------------------------------------
    function buildAdminHtml() {
      const itemsRows = (body.cart || []).map(item => `
        <tr style="border-top:1px solid #2a2a2a;">
          <td style="padding:12px 14px; font-size:13px; color:#e0e0e0;">
            <strong>${item.name}</strong>
            ${item.color ? `<div style="font-size:11px; color:#888;">Color: ${item.color}</div>` : ''}
          </td>
          <td style="padding:12px 14px; font-size:13px; color:#e0e0e0; text-align:center;">${item.qty}</td>
          <td style="padding:12px 14px; font-size:13px; color:#fabe1a; font-weight:600; text-align:right;">PKR ${(item.price * item.qty).toLocaleString('en-PK')}</td>
        </tr>
      `).join('');

      const waCustomerLink = `https://wa.me/92${phoneDigits}?text=${encodeURIComponent('Assalam o Alaikum ' + (body.name || 'Customer') + ', regarding your Experts Store order #' + (body.orderId || ''))}`;

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Order Alert - ${body.orderId || ''}</title>
  <style>
    body { background:#0d0d0d; font-family:'Segoe UI', Arial, sans-serif; color:#e0e0e0; margin:0; padding:0; }
    .wrap { max-width:620px; margin:0 auto; padding:30px 15px; }
    .card { background:#1a1a1a; border-radius:14px; border:1px solid #2a2a2a; overflow:hidden; }
    .hdr { background:#fabe1a; padding:22px 28px; display:flex; justify-content:space-between; align-items:center; }
    .hdr-logo { font-family:'Courier New', monospace; font-size:18px; font-weight:700; letter-spacing:2px; color:#111; }
    .body { padding:28px; }
    .strip { background:#222; border:1px solid #333; border-radius:8px; padding:14px 18px; margin-bottom:22px; }
    .title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#6b7280; margin-bottom:10px; }
    .info { background:#222; border-radius:8px; padding:16px 18px; margin-bottom:20px; font-size:13px; line-height:1.7; }
    .btn { display:inline-block; padding:12px 22px; border-radius:99px; text-decoration:none; font-weight:700; font-size:13px; margin-right:8px; margin-bottom:8px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <div class="hdr-logo">EXPERT.SERVICES</div>
        <div style="background:#111; color:#fabe1a; padding:4px 12px; border-radius:99px; font-size:11px; font-weight:700;">🔔 NEW ORDER</div>
      </div>
      <div class="body">
        <div class="strip">
          <table width="100%">
            <tr>
              <td>
                <div style="font-size:11px; color:#888; text-transform:uppercase;">Order ID</div>
                <div style="font-family:'Courier New', monospace; font-size:22px; font-weight:700; color:#fabe1a;">${body.orderId || ''}</div>
              </td>
              <td style="text-align:right; font-size:12px; color:#888;">
                ${dateStr}<br>${timeStr} PKT
              </td>
            </tr>
          </table>
        </div>

        <div class="title">Customer Details</div>
        <div class="info">
          <div><strong>Name:</strong> ${body.name || 'Customer'}</div>
          <div><strong>Phone:</strong> <a href="tel:${body.phone || ''}" style="color:#fabe1a; text-decoration:none;">${body.phone || ''}</a></div>
          <div><strong>Email:</strong> ${body.email ? `<a href="mailto:${body.email}" style="color:#fabe1a;">${body.email}</a>` : 'Not provided'}</div>
          <div><strong>Address:</strong> ${body.address || ''}, ${body.city || ''}</div>
          <div><strong>Payment:</strong> <span style="color:#4ade80; font-weight:600;">${paymentDisplay}</span></div>
          ${body.notes ? `<div><strong>Notes:</strong> ${body.notes}</div>` : ''}
        </div>

        <div style="margin-bottom:22px;">
          <a href="${waCustomerLink}" class="btn" style="background:#25D366; color:#ffffff;">💬 Open Customer WhatsApp</a>
          <a href="tel:${body.phone || ''}" class="btn" style="background:#333; color:#ffffff;">📞 Call Customer</a>
        </div>

        <div class="title">Ordered Products</div>
        <table width="100%" style="border-collapse:collapse; background:#222; border-radius:8px; overflow:hidden; margin-bottom:22px;">
          <thead>
            <tr style="background:#282828;">
              <th style="padding:10px 14px; font-size:11px; color:#888; text-align:left;">Item</th>
              <th style="padding:10px 14px; font-size:11px; color:#888; text-align:center;">Qty</th>
              <th style="padding:10px 14px; font-size:11px; color:#888; text-align:right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="title">Payment Summary</div>
        <div class="info">
          <table width="100%">
            <tr>
              <td style="color:#888;">Subtotal</td>
              <td style="text-align:right;">PKR ${subtotalFormatted}</td>
            </tr>
            <tr>
              <td style="color:#888;">Shipping</td>
              <td style="text-align:right;">${shippingText}</td>
            </tr>
            <tr style="font-size:16px; font-weight:700; color:#ffffff;">
              <td style="padding-top:8px; border-top:1px solid #333;">Total Order Value</td>
              <td style="padding-top:8px; border-top:1px solid #333; text-align:right; color:#fabe1a;">PKR ${totalFormatted}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
    }

    // -----------------------------------------------------------------
    // Dispatch Emails
    // -----------------------------------------------------------------
    const dispatchPromises = [];

    // 1. Admin Email (Always sent)
    if (adminEmail && adminEmail.includes('@')) {
      dispatchPromises.push(
        sendViaResend(
          adminEmail,
          `🔔 New Order: ${body.orderId} (PKR ${totalFormatted}) - ${body.name || 'Customer'}`,
          buildAdminHtml()
        ).then(res => ({ type: 'admin', ...res }))
      );
    }

    // 2. Customer Email (Sent if email provided)
    if (body.email && body.email.includes('@')) {
      dispatchPromises.push(
        sendViaResend(
          body.email,
          `Order Confirmation - ${body.orderId} | Experts Store`,
          buildCustomerHtml()
        ).then(res => ({ type: 'customer', ...res }))
      );
    }

    const results = await Promise.all(dispatchPromises);

    const adminResult = results.find(r => r.type === 'admin');
    const customerResult = results.find(r => r.type === 'customer');

    const failures = results.filter(r => !r.success);
    const hasFailure = failures.length > 0;

    let errorMsg = null;
    if (hasFailure) {
      errorMsg = failures.map(f => {
        const errObj = f.error;
        if (typeof errObj === 'string') return errObj;
        if (errObj && errObj.message) return errObj.message;
        return JSON.stringify(errObj || f);
      }).join(' | ');
    }

    return new Response(JSON.stringify({
      success: !hasFailure,
      error: errorMsg,
      from: fromEmail,
      admin: adminResult || null,
      customer: customerResult || null,
      results: results
    }), {
      status: hasFailure ? 207 : 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('send-order-email error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal Server Error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
