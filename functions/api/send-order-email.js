export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Parse incoming JSON payload from checkout.js
    const body = await request.json();

    const resendApiKey = env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set in environment variables');
      return new Response(JSON.stringify({ error: 'Email service not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fromEmail = env.RESEND_FROM_EMAIL || 'Experts Store <orders@experts.pk>';
    const adminEmail = env.STORE_ADMIN_EMAIL || 'Ayesha.amjad1999@gmail.com';

    // Format date and time for Pakistan Time (PKT)
    const now = new Date();
    const dateOptions = { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' };
    const timeOptions = { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true };
    const dateStr = new Intl.DateTimeFormat('en-PK', dateOptions).format(now);
    const timeStr = new Intl.DateTimeFormat('en-PK', timeOptions).format(now);

    const subtotalFormatted = (body.subtotal || 0).toLocaleString('en-PK');
    const totalFormatted = (body.total || 0).toLocaleString('en-PK');
    const shippingText = body.shipping?.text || 'Free Delivery';
    const phoneDigits = (body.phone || '').replace(/\D/g, '').replace(/^0+/, '');

    // -------------------------------------------------------------
    // 1. Build & Send Customer Confirmation Email (if customer has email)
    // -------------------------------------------------------------
    let customerEmailPromise = Promise.resolve();

    if (body.email && body.email.includes('@')) {
      try {
        const custTemplateUrl = new URL('/email-templates/order-confirmation-resend.html', request.url);
        const custTemplateResp = await fetch(custTemplateUrl);
        
        if (custTemplateResp.ok) {
          let custHtml = await custTemplateResp.text();

          // Build customer order items table
          const customerItemsHtml = (body.cart || []).map(item => `
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

          custHtml = custHtml.replace(/{{CUSTOMER_NAME}}/g, body.name || 'Customer');
          custHtml = custHtml.replace(/{{ORDER_ID}}/g, body.orderId || '');
          custHtml = custHtml.replace(/{{ORDER_DATE}}/g, dateStr);
          custHtml = custHtml.replace(/{{ORDER_TIME}}/g, timeStr);
          custHtml = custHtml.replace(/{{SUBTOTAL}}/g, subtotalFormatted);
          custHtml = custHtml.replace(/{{SHIPPING_TEXT}}/g, shippingText);
          custHtml = custHtml.replace(/{{TOTAL_AMOUNT}}/g, totalFormatted);
          custHtml = custHtml.replace(/{{PHONE}}/g, body.phone || '');
          custHtml = custHtml.replace(/{{ADDRESS}}/g, body.address || '');
          custHtml = custHtml.replace(/{{CITY}}/g, body.city || '');
          custHtml = custHtml.replace(/<!--\s*EXAMPLE[\s\S]*?END EXAMPLE\s*-->/g, customerItemsHtml);

          customerEmailPromise = fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [body.email],
              subject: `Order Confirmation - ${body.orderId} | Experts Store`,
              html: custHtml
            })
          });
        }
      } catch (err) {
        console.error('Error preparing customer email:', err);
      }
    }

    // -------------------------------------------------------------
    // 2. Build & Send Admin Notification Email
    // -------------------------------------------------------------
    let adminEmailPromise = Promise.resolve();

    if (adminEmail && adminEmail.includes('@')) {
      try {
        const adminTemplateUrl = new URL('/email-templates/admin-notification.html', request.url);
        const adminTemplateResp = await fetch(adminTemplateUrl);

        if (adminTemplateResp.ok) {
          let adminHtml = await adminTemplateResp.text();

          const adminItemsHtml = (body.cart || []).map(item => `
            <tr class="items-table-row">
              <td class="item-name-cell">
                <div class="name">${item.name}</div>
                ${item.color ? `<div class="meta">Color: ${item.color}</div>` : ''}
              </td>
              <td style="text-align:center;">${item.qty}</td>
              <td>PKR ${(item.price * item.qty).toLocaleString('en-PK')}</td>
            </tr>
          `).join('');

          const paymentLabels = {
            cod: '💵 &nbsp;Cash on Delivery (COD)',
            easypaisa: '💚 &nbsp;Easypaisa',
            jazzcash: '🔴 &nbsp;JazzCash',
            bank: '🏦 &nbsp;Bank Transfer'
          };
          const paymentDisplay = paymentLabels[body.payment] || 'Cash on Delivery';

          adminHtml = adminHtml.replace(/{{order_id}}/g, body.orderId || '');
          adminHtml = adminHtml.replace(/{{order_date}}/g, dateStr);
          adminHtml = adminHtml.replace(/{{order_time}}/g, timeStr);
          adminHtml = adminHtml.replace(/{{customer_name}}/g, body.name || 'Customer');
          adminHtml = adminHtml.replace(/{{phone}}/g, body.phone || '');
          adminHtml = adminHtml.replace(/{{phone_digits}}/g, phoneDigits);
          adminHtml = adminHtml.replace(/{{email}}/g, body.email || 'N/A');
          adminHtml = adminHtml.replace(/{{address}}/g, body.address || '');
          adminHtml = adminHtml.replace(/{{city}}/g, body.city || '');
          adminHtml = adminHtml.replace(/{{subtotal}}/g, subtotalFormatted);
          adminHtml = adminHtml.replace(/{{shipping_text}}/g, shippingText);
          adminHtml = adminHtml.replace(/{{total_amount}}/g, totalFormatted);
          adminHtml = adminHtml.replace(/{{order_notes}}/g, body.notes || 'No customer notes provided.');
          adminHtml = adminHtml.replace(/<div class="payment-status[^"]*">[\s\S]*?<\/div>/, `<div class="payment-status payment-${body.payment || 'cod'}">${paymentDisplay}</div>`);

          // Replace static table rows in admin template with dynamic items
          adminHtml = adminHtml.replace(/<tbody>[\s\S]*?<\/tbody>/, `<tbody>${adminItemsHtml}</tbody>`);

          adminEmailPromise = fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [adminEmail],
              subject: `🔔 New Order Received: ${body.orderId} - PKR ${totalFormatted}`,
              html: adminHtml
            })
          });
        }
      } catch (err) {
        console.error('Error preparing admin email:', err);
      }
    }

    // Await both email requests
    const [custRes, adminRes] = await Promise.allSettled([customerEmailPromise, adminEmailPromise]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Order processed and emails dispatched',
      customerEmailSent: custRes.status === 'fulfilled',
      adminEmailSent: adminRes.status === 'fulfilled'
    }), {
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
