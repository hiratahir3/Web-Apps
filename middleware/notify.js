// Optional WhatsApp notification via Twilio. Falls back to console.log if not configured.
async function notifyOwner(text) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const to = process.env.OWNER_WHATSAPP;
  if (!sid || !token || !from || !to) {
    console.log('[notify:console]', text);
    return;
  }
  try {
    const body = new URLSearchParams({ From: from, To: to, Body: text });
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!r.ok) console.warn('[notify:twilio] failed', r.status, await r.text());
  } catch (e) {
    console.warn('[notify:twilio] error', e.message);
  }
}

module.exports = { notifyOwner };
