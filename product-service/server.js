const app = require('./apps');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Product Service siap:');
    console.log(`  API products: http://localhost:${PORT}/products`);
    console.log(`  OpenAPI untuk Insomnia: http://localhost:${PORT}/openapi.json`);
    console.log(`  Health check: http://localhost:${PORT}/health`);
});