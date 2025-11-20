exports.handler = async function(event, context) {
    // Hanya terima method POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { text, voiceName, voiceLang, voiceGender, rate, pitch } = JSON.parse(event.body);
        
        // Ambil rahasia dari Environment Variables Netlify
        const apiKey = process.env.AZURE_TTS_KEY;
        const region = process.env.AZURE_TTS_REGION;

        if (!apiKey || !region) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Konfigurasi Server Error: API Key/Region tidak ditemukan." })
            };
        }

        // Konstruksi SSML di sisi server (lebih aman)
        const ssml = `
            <speak version='1.0' xml:lang='${voiceLang}'>
                <voice xml:lang='${voiceLang}' xml:gender='${voiceGender}' name='${voiceName}'>
                    <prosody rate="${rate}" pitch="${pitch}%">
                        ${text}
                    </prosody>
                </voice>
            </speak>
        `;

        // Panggil Azure API
        const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                'User-Agent': 'SuaraPro-Backend'
            },
            body: ssml
        });

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Azure Error: ${response.statusText}` })
            };
        }

        // Ubah response audio menjadi buffer lalu ke base64 agar bisa dikirim via JSON/HTTP response Netlify
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'attachment; filename="tts-audio.mp3"'
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};