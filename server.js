const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// --- Configuracion desde variables de entorno ---
// El token JAMAS se escribe en el codigo. Viene de un Secret de OpenShift.
const DT_TENANT = process.env.DT_TENANT || 'ylf61356.live.dynatrace.com';
const DT_TOKEN = process.env.DT_TOKEN;

// El Salvador es UTC-6 todo el ano (no tiene horario de verano)
const TZ_OFFSET_HOURS = 6;

app.use(express.static(path.join(__dirname, 'public')));

// Convierte una fecha 'YYYY-MM-DD' (interpretada como hora local de El Salvador)
// a milisegundos epoch, que es lo que espera el API de Dynatrace.
function localDateToEpoch(dateStr, endOfDay) {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (endOfDay) {
    // 23:59:59.999 local  ->  +6h para pasar a UTC
    return Date.UTC(y, m - 1, d, 23 + TZ_OFFSET_HOURS, 59, 59, 999);
  }
  // 00:00:00 local  ->  +6h para pasar a UTC
  return Date.UTC(y, m - 1, d, TZ_OFFSET_HOURS, 0, 0, 0);
}

app.get('/api/report', async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: 'Debes indicar fecha inicial y final.' });
  }
  if (!DT_TOKEN) {
    return res.status(500).json({ error: 'El token de Dynatrace no esta configurado en el servidor.' });
  }

  const startTs = localDateToEpoch(start, false);
  const endTs = localDateToEpoch(end, true);

  if (startTs > endTs) {
    return res.status(400).json({ error: 'La fecha inicial es posterior a la final.' });
  }

  // Misma consulta que ya usabas en el workflow.
  const query = 'SELECT count(*) as Conteo_OB FROM usersession WHERE useraction.name="start_onboarding"';
  const url = `https://${DT_TENANT}/api/v1/userSessionQueryLanguage/table` +
    `?query=${encodeURIComponent(query)}` +
    `&startTimestamp=${startTs}` +
    `&endTimestamp=${endTs}`;

  // Rastro de auditoria: queda registrado en los logs del pod.
  console.log(`[${new Date().toISOString()}] Consulta OB rango ${start} -> ${end}`);

  try {
    const dtRes = await fetch(url, {
      headers: {
        'Authorization': `Api-Token ${DT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dtRes.ok) {
      const text = await dtRes.text();
      console.error('Error de Dynatrace', dtRes.status, text);
      return res.status(502).json({ error: `Dynatrace respondio con codigo ${dtRes.status}.` });
    }

    const data = await dtRes.json();
    const conteo = data.values?.[0]?.[0] ?? 0;
    res.json({ conteo, start, end });
  } catch (err) {
    console.error('Fallo al consultar Dynatrace', err);
    res.status(502).json({ error: 'No se pudo consultar Dynatrace.' });
  }
});

// Sonda de salud para OpenShift
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Portal OB escuchando en el puerto ${PORT}`));
