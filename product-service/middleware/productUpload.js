const multer = require('multer');

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const productUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 5,
        fieldSize: 65535,
        parts: 6
    },
    fileFilter(req, file, callback) {
        if (!acceptedTypes.has(file.mimetype)) {
            return callback(new Error('Format foto harus JPG, JPEG, PNG, atau WEBP'));
        }
        return callback(null, true);
    }
});

module.exports = productUpload;
