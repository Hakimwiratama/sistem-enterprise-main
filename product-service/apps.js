const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes'); 

const app = express();

function hasOversizedImage(body) {
    if (typeof body !== 'string') return false;

    const imageMatch = /"image"\s*:\s*"([^"]*)/i.exec(body);
    if (!imageMatch) return false;

    const base64 = imageMatch[1].replace(
        /^data:image\/(?:png|jpeg);base64,/i,
        ''
    );
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const decodedSize = Math.floor((base64.length * 3) / 4) - padding;

    return decodedSize > 2 * 1024 * 1024;
}

app.use(cors());
app.use(express.json({ limit: '3mb' }));

app.get('/', (req, res) => {
    res.json({
        service: 'product-service',
        openapi: '/openapi.json',
        health: '/health'
    });
});

app.get('/openapi.json', (req, res) => {
    res.json(require('./openapi.json'));
});

// endpoint for health check
app.get('/health', (req, res) => {
    res.json({ 
        status: "ok",
        service: "product-service"
    });
});

app.use("/products", productRoutes);

//unknown path
app.use((req, res) => {
    res.status(404).json({
        message: "Endpoint tidak dikenal"
    });
});

app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            message: 'Data product tidak valid',
            errors: ['Ukuran image maksimal 2 MB']
        });
    }

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            message: 'Data product tidak valid',
            errors: [
                hasOversizedImage(error.body)
                    ? 'Ukuran image maksimal 2 MB'
                    : 'Request body harus berupa JSON yang valid'
            ]
        });
    }

    next(error);
});

module.exports = app;