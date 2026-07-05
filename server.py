"""שרת מחולל התרגילים — הגשת קבצים סטטיים + REST API לניהול תרגילים.

הרצה:  python3 server.py            (פורט ברירת מחדל: 8081, או PORT מהסביבה)
נתונים: exercises.db (SQLite, נוצר אוטומטית ליד הקובץ הזה)

תיעוד מלא של ה-API: ראה API.md
"""
import http.server
import json
import os
import re
import sqlite3
import time
import urllib.parse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'exercises.db')
MAX_BODY_BYTES = 5 * 1024 * 1024  # 5MB — תרגיל בודד גדול לא מתקרב לזה
ID_RE = re.compile(r'^[\w\-.]{1,128}$')


# ─────────────────────────── DB ───────────────────────────

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS exercises (
        id         TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )''')
    return conn


def now_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def row_to_exercise(row):
    ex = json.loads(row[1])
    ex['id'] = row[0]
    ex['serverCreatedAt'] = row[2]
    ex['serverUpdatedAt'] = row[3]
    return ex


def new_id():
    return f'id_{int(time.time() * 1000)}_{os.urandom(3).hex()}'


def upsert_exercise(conn, ex):
    """מכניס או מעדכן תרגיל. מחזיר את התרגיל כפי שנשמר."""
    ex = dict(ex)
    ex_id = str(ex.get('id') or new_id())
    if not ID_RE.match(ex_id):
        raise ApiError(400, f'מזהה תרגיל לא חוקי: {ex_id!r}')
    ex['id'] = ex_id
    ex.pop('serverCreatedAt', None)
    ex.pop('serverUpdatedAt', None)
    ts = now_iso()
    data = json.dumps(ex, ensure_ascii=False)
    conn.execute('''INSERT INTO exercises (id, data, created_at, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET data = excluded.data,
                                                  updated_at = excluded.updated_at''',
                 (ex_id, data, ts, ts))
    row = conn.execute('SELECT id, data, created_at, updated_at FROM exercises WHERE id = ?',
                       (ex_id,)).fetchone()
    return row_to_exercise(row)


def exercise_summary(ex):
    return {
        'id': ex.get('id'),
        'name': ex.get('name', ''),
        'date': ex.get('date', ''),
        'location': ex.get('location', ''),
        'exerciseType': ex.get('exerciseType', ''),
        'mainScenario': ex.get('mainScenario', ''),
        'complexity': ex.get('complexity'),
        'injectionCount': len(ex.get('injections') or []),
        'createdAt': ex.get('createdAt', ''),
        'serverUpdatedAt': ex.get('serverUpdatedAt', ''),
    }


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


# ─────────────────────────── HTTP ───────────────────────────

class DrillHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # ---- helpers ----

    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(body)

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def read_json_body(self):
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0:
            raise ApiError(400, 'חסר גוף בקשה (JSON)')
        if length > MAX_BODY_BYTES:
            raise ApiError(413, 'גוף הבקשה גדול מדי')
        raw = self.rfile.read(length)
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise ApiError(400, 'גוף הבקשה אינו JSON תקין')

    def api_route(self):
        """מחזיר (segments, query) עבור נתיבי /api/, או None לקבצים סטטיים."""
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != '/api' and not parsed.path.startswith('/api/'):
            return None
        segments = [s for s in parsed.path.split('/') if s][1:]  # בלי 'api'
        query = urllib.parse.parse_qs(parsed.query)
        return segments, query

    # ---- HTTP methods ----

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        route = self.api_route()
        if route is None:
            return super().do_GET()
        self.handle_api('GET', *route)

    def do_POST(self):
        self.dispatch_api('POST')

    def do_PUT(self):
        self.dispatch_api('PUT')

    def do_DELETE(self):
        self.dispatch_api('DELETE')

    def dispatch_api(self, method):
        route = self.api_route()
        if route is None:
            return self.send_json({'error': 'נתיב לא קיים'}, 404)
        self.handle_api(method, *route)

    # ---- API routing ----

    def handle_api(self, method, segments, query):
        try:
            conn = db()
            try:
                result = self.route_api(conn, method, segments, query)
                conn.commit()
            finally:
                conn.close()
            if result is not None:
                status, payload = result
                self.send_json(payload, status)
        except ApiError as e:
            self.send_json({'error': e.message}, e.status)
        except Exception as e:  # noqa: BLE001
            self.send_json({'error': f'שגיאת שרת: {e}'}, 500)

    def route_api(self, conn, method, segments, query):
        if segments == ['health'] and method == 'GET':
            count = conn.execute('SELECT COUNT(*) FROM exercises').fetchone()[0]
            return 200, {'ok': True, 'exerciseCount': count, 'time': now_iso()}

        if segments == ['exercises']:
            if method == 'GET':
                return self.list_exercises(conn, query)
            if method == 'POST':
                body = self.read_json_body()
                if not isinstance(body, dict):
                    raise ApiError(400, 'תרגיל חייב להיות אובייקט JSON')
                if body.get('id') is not None:
                    exists = conn.execute('SELECT 1 FROM exercises WHERE id = ?',
                                          (str(body['id']),)).fetchone()
                    if exists:
                        raise ApiError(409, 'תרגיל עם מזהה זה כבר קיים — השתמש ב-PUT לעדכון')
                return 201, upsert_exercise(conn, body)

        if segments == ['exercises', 'sync'] and method == 'POST':
            return self.sync_exercises(conn)

        if len(segments) == 2 and segments[0] == 'exercises':
            return self.exercise_by_id(conn, method, segments[1])

        if len(segments) == 3 and segments[0] == 'exercises' and segments[2] == 'duplicate' \
                and method == 'POST':
            return self.duplicate_exercise(conn, segments[1])

        raise ApiError(404, 'נתיב API לא קיים')

    # ---- endpoint implementations ----

    def list_exercises(self, conn, query):
        rows = conn.execute(
            'SELECT id, data, created_at, updated_at FROM exercises ORDER BY updated_at DESC'
        ).fetchall()
        exercises = [row_to_exercise(r) for r in rows]

        q = (query.get('q', [''])[0]).strip()
        if q:
            needle = q.lower()
            exercises = [e for e in exercises
                         if needle in str(e.get('name', '')).lower()
                         or needle in str(e.get('location', '')).lower()]
        ex_type = query.get('type', [''])[0]
        if ex_type:
            exercises = [e for e in exercises if e.get('exerciseType') == ex_type]
        scenario = query.get('scenario', [''])[0]
        if scenario:
            exercises = [e for e in exercises if e.get('mainScenario') == scenario]

        total = len(exercises)
        try:
            offset = max(0, int(query.get('offset', ['0'])[0]))
            limit = int(query.get('limit', ['0'])[0])
        except ValueError:
            raise ApiError(400, 'limit/offset חייבים להיות מספרים')
        if limit > 0:
            exercises = exercises[offset:offset + limit]
        elif offset:
            exercises = exercises[offset:]

        if query.get('summary', [''])[0] in ('1', 'true'):
            exercises = [exercise_summary(e) for e in exercises]
        return 200, {'total': total, 'exercises': exercises}

    def exercise_by_id(self, conn, method, ex_id):
        row = conn.execute('SELECT id, data, created_at, updated_at FROM exercises WHERE id = ?',
                           (ex_id,)).fetchone()
        if method == 'GET':
            if not row:
                raise ApiError(404, 'תרגיל לא נמצא')
            return 200, row_to_exercise(row)
        if method == 'PUT':
            body = self.read_json_body()
            if not isinstance(body, dict):
                raise ApiError(400, 'תרגיל חייב להיות אובייקט JSON')
            body['id'] = ex_id
            return 200, upsert_exercise(conn, body)
        if method == 'DELETE':
            if not row:
                raise ApiError(404, 'תרגיל לא נמצא')
            conn.execute('DELETE FROM exercises WHERE id = ?', (ex_id,))
            return 200, {'deleted': ex_id}
        raise ApiError(405, 'שיטה לא נתמכת')

    def duplicate_exercise(self, conn, ex_id):
        row = conn.execute('SELECT id, data, created_at, updated_at FROM exercises WHERE id = ?',
                           (ex_id,)).fetchone()
        if not row:
            raise ApiError(404, 'תרגיל לא נמצא')
        copy = row_to_exercise(row)
        copy['id'] = new_id()
        copy['name'] = f"{copy.get('name', '')} (עותק)"
        copy['createdAt'] = time.strftime('%Y-%m-%d')
        return 201, upsert_exercise(conn, copy)

    def sync_exercises(self, conn):
        """סנכרון מלא מהלקוח: upsert של כל התרגילים שנשלחו.
        עם replace=true — תרגילים שאינם ברשימה יימחקו (מראה מלאה של הלקוח)."""
        body = self.read_json_body()
        if not isinstance(body, dict) or not isinstance(body.get('exercises'), list):
            raise ApiError(400, 'צפוי אובייקט עם מערך exercises')
        incoming = body['exercises']
        for ex in incoming:
            if not isinstance(ex, dict):
                raise ApiError(400, 'כל תרגיל חייב להיות אובייקט JSON')
        saved = [upsert_exercise(conn, ex) for ex in incoming]
        deleted = 0
        if body.get('replace'):
            keep = tuple(e['id'] for e in saved)
            placeholders = ','.join('?' * len(keep))
            if keep:
                cur = conn.execute(
                    f'DELETE FROM exercises WHERE id NOT IN ({placeholders})', keep)
            else:
                cur = conn.execute('DELETE FROM exercises')
            deleted = cur.rowcount
        return 200, {'synced': len(saved), 'deleted': deleted, 'exercises': saved}

    def log_message(self, fmt, *args):
        # לוג שקט יותר: רק בקשות API
        if self.path.startswith('/api'):
            super().log_message(fmt, *args)


def main():
    port = int(os.environ.get('PORT', 8081))
    db().close()  # יצירת קובץ ה-DB והטבלה מראש
    httpd = http.server.ThreadingHTTPServer(('', port), DrillHandler)
    print(f'מחולל תרגילים פועל על פורט {port}')
    print(f'ממשק:  http://localhost:{port}')
    print(f'API:   http://localhost:{port}/api/exercises   (תיעוד: API.md)')
    httpd.serve_forever()


if __name__ == '__main__':
    main()
