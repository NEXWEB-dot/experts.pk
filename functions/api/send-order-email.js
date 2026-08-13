export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Parse the incoming JSON payload from checkout.js
    const body = await request.json();

    // Fetch the email template from the static assets
    // This allows the Worker to read the HTML file from the deployed Pages site
    const templateUrl = new URL('/email-templates/order-confirmation-resend.html', request.url);
    const templateResponse = await fetch(templateUrl);
    
    if (!templateResponse.ok) {
      throw new Error('Could not load email template');
    }
    
    let html = await templateResponse.text();

    // Format date and time for Pakistan Time (PKT)
    const now = new Date();
    const dateOptions = { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' };
    const timeOptions = { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true };
    const dateStr = new Intl.DateTimeFormat('en-PK', dateOptions).format(now);
    const timeStr = new Intl.DateTimeFormat('en-PK', timeOptions).format(now);

    // Build the order items HTML
    const itemsHtml = (body.cart || []).map(item => `
      <table width="100%" style="margin-bottom:0;">
        <tr class="item-row">
          <td style="padding:14px 0; border-bottom:1px solid #f0f0f5;">
            <div class="item-name">${item.name}</div>
            <div class="item-meta">
              ${item.color ? `Color: ${item.color} &nbsp;&middot;&nbsp; ` : ''}
              Qty: ${item.qty}
            </div>
          </td>
          <td style="padding:14px 0 14px 16px; border-bottom:1px solid #f0f0f5; text-align:right; white-space:nowrap;">
            <div class="item-price">PKR ${(item.price * item.qty).toLocaleString('en-PK')}</div>
          </td>
        </tr>
      </table>
    `).join('');

    // Replace basic variables
    html = html.replace(/{{CUSTOMER_NAME}}/g, body.name || 'Customer');
    html = html.replace(/{{ORDER_ID}}/g, body.orderId || '');
    html = html.replace(/{{ORDER_DATE}}/g, dateStr);
    html = html.replace(/{{ORDER_TIME}}/g, timeStr);
    html = html.replace(/{{SUBTOTAL}}/g, body.subtotal?.toLocaleString('en-PK') || '0');
    html = html.replace(/{{SHIPPING_TEXT}}/g, body.shipping?.text || '');
    html = html.replace(/{{TOTAL_AMOUNT}}/g, body.total?.toLocaleString('en-PK') || '0');
    html = html.replace(/{{PHONE}}/g, body.phone || '');
    html = html.replace(/{{ADDRESS}}/g, body.address || '');
    html = html.replace(/{{CITY}}/g, body.city || '');

    // Replace the example items block with the dynamically generated items
    html = html.replace(/<!--\s*EXAMPLE[\s\S]*?END EXAMPLE\s*-->/g, itemsHtml);

    // Resend API integration
    const resendApiKey = env.RESEND_API_KEY; 
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set in environment variables');
      return new Response(JSON.stringify({ error: 'Email service not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const emailPayload = {
      from: 'Experts Store <orders@experts.com.pk>', // MUST be a verified domain in Resend
      to: [body.email],
      subject: `Your Order Confirmation - ${body.orderId}`,
      html: html
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Email sending failed:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
