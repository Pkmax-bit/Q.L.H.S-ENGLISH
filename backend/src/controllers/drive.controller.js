/**
 * Proxy stream file Google Drive (file đã share "Anyone with the link") để:
 *   - Vượt qua giới hạn hotlinking với file lớn (Google chèn HTML virus warning)
 *   - Hỗ trợ Range request cho audio / video seek
 *   - Set Content-Type & Content-Length đúng để <audio>, <img>, <video> chạy được
 *
 * GET /api/drive-proxy?id={fileId}
 *
 * Lưu ý:
 *   - File phải share "Anyone with the link can view" (không thì nhận HTML chuyển hướng login).
 *   - Endpoint công khai (không yêu cầu JWT) vì <audio src=...> của browser không gửi
 *     Authorization header. Bù lại, ta khoá rate-limit theo IP và chỉ cho phép Drive.
 */

const response = require('../utils/response');
const { Readable } = require('stream');

/** Dùng Map đơn giản làm rate-limit theo IP — đủ cho Render free tier. */
const rateBucket = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_WINDOW = 120;

function checkRate(ip) {
  const now = Date.now();
  const entry = rateBucket.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateBucket.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  if (entry.count > RATE_MAX_PER_WINDOW) return false;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateBucket) {
    if (now - entry.start > RATE_WINDOW_MS) rateBucket.delete(ip);
  }
}, 5 * 60 * 1000).unref();

/** Forward Drive response sang client với Range / cache headers. */
function pipeDriveResponse(res, upstream) {
  res.status(upstream.status === 206 ? 206 : 200);
  const passthrough = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'last-modified',
    'etag',
  ];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (!upstream.body) {
    res.end();
    return;
  }
  // Convert WHATWG ReadableStream → Node Readable rồi pipe ra response
  const nodeStream = Readable.fromWeb(upstream.body);
  nodeStream.on('error', (err) => {
    if (!res.headersSent) res.status(502);
    res.end();
    console.error('[drive-proxy] stream error:', err.message);
  });
  res.on('close', () => {
    try { nodeStream.destroy(); } catch {}
  });
  nodeStream.pipe(res);
}

/** Tải URL Drive — tự bắt trường hợp Google trả HTML virus warning và retry với confirm token. */
async function fetchDrive(fileId, rangeHeader) {
  const baseUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&authuser=0`;
  const headers = {
    // Trick: gửi UA "thường" để tránh Drive trả về trang HTML chuyên cho bot
    'User-Agent': 'Mozilla/5.0 (compatible; EducationCenter/1.0)',
    Accept: '*/*',
  };
  if (rangeHeader) headers.Range = rangeHeader;

  // Lần 1: thử với confirm=t (đủ cho hầu hết file <2GB share public)
  let upstream = await fetch(`${baseUrl}&confirm=t`, { headers, redirect: 'follow' });

  // Nếu vẫn nhận HTML (Google chèn trang xác nhận / file private) → cố gắng đọc HTML lấy uuid
  let ct = upstream.headers.get('content-type') || '';
  if (ct.includes('text/html')) {
    const html = await upstream.text();
    // Tìm action form & các trường hidden
    const uuidMatch = html.match(/name=["']uuid["']\s+value=["']([^"']+)["']/i);
    const confirmMatch = html.match(/name=["']confirm["']\s+value=["']([^"']+)["']/i)
      || html.match(/[?&]confirm=([0-9A-Za-z_-]+)/);
    if (uuidMatch && confirmMatch) {
      const params = new URLSearchParams({
        id: fileId,
        export: 'download',
        authuser: '0',
        confirm: confirmMatch[1],
        uuid: uuidMatch[1],
      });
      upstream = await fetch(
        `https://drive.usercontent.google.com/download?${params.toString()}`,
        { headers, redirect: 'follow' }
      );
      ct = upstream.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        // Vẫn HTML → file private hoặc Google đổi cấu trúc trang
        return { upstream: null, status: 502, message: 'Google Drive yêu cầu xác nhận thủ công (file có thể chưa share công khai hoặc quá lớn).' };
      }
    } else {
      return { upstream: null, status: 403, message: 'File Google Drive chưa share công khai (Anyone with the link).' };
    }
  }

  if (upstream.status >= 400) {
    return { upstream: null, status: upstream.status, message: `Google Drive trả về ${upstream.status}` };
  }

  return { upstream, status: upstream.status };
}

const proxy = async (req, res, next) => {
  try {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRate(ip)) {
      return response.error(res, 'Quá nhiều request, vui lòng thử lại sau 1 phút.', 429);
    }

    const fileId = String(req.query.id || '').trim();
    if (!fileId || !/^[A-Za-z0-9_-]{10,}$/.test(fileId)) {
      return response.badRequest(res, 'Thiếu hoặc sai fileId Drive.');
    }

    const result = await fetchDrive(fileId, req.headers.range);
    if (!result.upstream) {
      return response.error(res, result.message || 'Không tải được file Drive', result.status || 502);
    }

    pipeDriveResponse(res, result.upstream);
  } catch (err) {
    console.error('[drive-proxy] error:', err);
    if (!res.headersSent) {
      return next(err);
    }
    res.end();
  }
};

/** Chỉ kiểm tra metadata (HEAD-like) — trả JSON content-type + content-length nếu có. Dùng cho UI test. */
const head = async (req, res, next) => {
  try {
    const fileId = String(req.query.id || '').trim();
    if (!fileId || !/^[A-Za-z0-9_-]{10,}$/.test(fileId)) {
      return response.badRequest(res, 'Thiếu hoặc sai fileId Drive.');
    }
    const result = await fetchDrive(fileId, 'bytes=0-0');
    if (!result.upstream) {
      return response.error(res, result.message || 'Không tải được file Drive', result.status || 502);
    }
    const ct = result.upstream.headers.get('content-type') || '';
    const cr = result.upstream.headers.get('content-range') || '';
    // Lấy total size từ Content-Range "bytes 0-0/12345"
    const sizeMatch = cr.match(/\/(\d+)$/);
    const size = sizeMatch ? Number(sizeMatch[1]) : null;

    // Dọn body để giải phóng connection
    try { await result.upstream.body?.cancel(); } catch {}

    return response.success(res, {
      file_id: fileId,
      content_type: ct || null,
      size_bytes: size,
      ok: true,
    }, 'Drive file accessible');
  } catch (err) {
    next(err);
  }
};

module.exports = { proxy, head };
