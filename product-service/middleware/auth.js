const crypto = require('node:crypto');

function decodeSegment(segment) {
    if (!/^[A-Za-z0-9_-]+$/.test(segment)) return null;
    try {
        return Buffer.from(segment, 'base64url');
    } catch {
        return null;
    }
}

function verifyToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
        const error = new Error('Autentikasi belum dikonfigurasi dengan aman');
        error.status = 503;
        throw error;
    }

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const headerBytes = decodeSegment(parts[0]);
    const payloadBytes = decodeSegment(parts[1]);
    const signature = decodeSegment(parts[2]);
    if (!headerBytes || !payloadBytes || !signature) return null;

    let header;
    let payload;
    try {
        header = JSON.parse(headerBytes.toString('utf8'));
        payload = JSON.parse(payloadBytes.toString('utf8'));
    } catch {
        return null;
    }

    if (header.alg !== 'HS256' || typeof payload.sub !== 'string' || !payload.sub.trim()) {
        return null;
    }
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) return null;
    if (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || payload.nbf > Date.now() / 1000)) {
        return null;
    }
    if (!['admin', 'seller', 'buyer'].includes(payload.role)) return null;
    if (process.env.JWT_ISSUER && payload.iss !== process.env.JWT_ISSUER) return null;
    if (
        process.env.JWT_AUDIENCE &&
        !(payload.aud === process.env.JWT_AUDIENCE || (
            Array.isArray(payload.aud) && payload.aud.includes(process.env.JWT_AUDIENCE)
        ))
    ) {
        return null;
    }

    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${parts[0]}.${parts[1]}`)
        .digest();
    if (
        signature.length !== expected.length ||
        !crypto.timingSafeEqual(signature, expected)
    ) {
        return null;
    }

    return { id: payload.sub, role: payload.role };
}

function authenticate(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = /^Bearer ([^\s]+)$/.exec(authorization);
    if (!match) {
        return res.status(401).json({ message: 'Token autentikasi diperlukan' });
    }

    try {
        const user = verifyToken(match[1]);
        if (!user) return res.status(401).json({ message: 'Token autentikasi tidak valid' });
        req.user = user;
        return next();
    } catch (error) {
        if (error.status === 503) {
            return res.status(503).json({ message: error.message });
        }
        return next(error);
    }
}

function allowRoles(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Role tidak memiliki izin untuk tindakan ini' });
        }
        return next();
    };
}

module.exports = { authenticate, allowRoles };
