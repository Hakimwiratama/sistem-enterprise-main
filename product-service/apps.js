const express = require('express');
const cors = require('cors');
const path = require('node:path');
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
app.use(express.json({ limit: '1mb' }));
const uploadDirectory = process.env.PRODUCT_UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDirectory, {
    dotfiles: 'deny',
    index: false,
    maxAge: '1y',
    immutable: true,
    setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

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
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Ukuran foto maksimal 5 MB' });
    }
    if (error.message === 'Unexpected field') {
        return res.status(400).json({ message: 'Gunakan field file bernama image' });
    }
    if (typeof error.message === 'string' && error.message.startsWith('Format foto')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FIELD_COUNT' || error.code === 'LIMIT_PART_COUNT') {
        return res.status(400).json({ message: 'Data product memiliki terlalu banyak field' });
    }
    if (error.code === 'LIMIT_FIELD_VALUE') {
        return res.status(413).json({ message: 'Ukuran field product terlalu besar' });
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Ukuran request terlalu besar' });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Request body harus berupa JSON yang valid' });
    }

    console.error('Unhandled Product Service request error:', error);
    return res.status(error.status || 500).json({
        message: error.status ? error.message : 'Terjadi kesalahan pada Product Service'
    });
});

module.exports = app;