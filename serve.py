#!/usr/bin/env python3
"""本地预览服务：支持 HTTP Range 请求（视频可拖动快进）。

用法：python3 serve.py [端口]   （默认 8080）
"""
import http.server
import os
import re
import sys


class RangeRequestHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler + 单段 Range (bytes=start-end) 支持。"""

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path) or not os.path.isfile(path):
            return super().send_head()

        size = os.path.getsize(path)
        ctype = self.guess_type(path)
        range_header = self.headers.get('Range')
        start, end = 0, size - 1
        status = 200

        if range_header:
            m = re.match(r'bytes=(\d*)-(\d*)$', range_header.strip())
            if m:
                if m.group(1):
                    start = int(m.group(1))
                if m.group(2):
                    end = min(int(m.group(2)), size - 1)
                if start > end or start >= size:
                    self.send_response(416)
                    self.send_header('Content-Range', f'bytes */{size}')
                    self.end_headers()
                    return None
                status = 206

        length = end - start + 1
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(length))
        if status == 206:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()

        f = open(path, 'rb')
        f.seek(start)
        self._range_remaining = length
        return _RangeFile(f, self)


class _RangeFile:
    """包装文件对象，限制 copyfile 只发送 Range 范围内的字节。"""

    def __init__(self, f, handler):
        self._f = f
        self._handler = handler

    def read(self, n=-1):
        remaining = self._handler._range_remaining
        if remaining <= 0:
            return b''
        if n < 0 or n > remaining:
            n = remaining
        data = self._f.read(n)
        self._handler._range_remaining -= len(data)
        return data

    def close(self):
        self._f.close()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    http.server.ThreadingHTTPServer(('127.0.0.1', port), RangeRequestHandler).serve_forever()
