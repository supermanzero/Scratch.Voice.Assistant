#!/usr/bin/env python3
"""
代理服务器，用于绕过百度API的CORS限制
运行此脚本后，在浏览器中访问 http://localhost:8000/standalone-tts-debug.html
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import webbrowser
import os
import sys
from pathlib import Path

# 设置端口
PORT = 8000

# 获取当前目录
current_dir = Path(__file__).parent

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加CORS头
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        # 处理预检请求
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        # 处理代理请求
        if self.path.startswith('/proxy/'):
            self.handle_proxy_request()
        else:
            super().do_POST()

    def handle_proxy_request(self):
        try:
            # 解析代理路径
            proxy_path = self.path[7:]  # 移除 '/proxy/' 前缀
            
            # 构建目标URL
            if proxy_path == 'baidu-token':
                # 百度Token请求
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # 解析POST数据
                params = urllib.parse.parse_qs(post_data.decode('utf-8'))
                ak = params.get('ak', [''])[0]
                sk = params.get('sk', [''])[0]
                
                # 构建百度API URL
                target_url = f'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={ak}&client_secret={sk}'
                
                # 发送请求到百度API
                req = urllib.request.Request(target_url, method='POST')
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    
                # 返回响应
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(data)
                
            elif proxy_path == 'baidu-tts':
                # 百度TTS请求
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                
                # 直接转发到百度TTS API
                target_url = 'https://tsn.baidu.com/text2audio'
                req = urllib.request.Request(target_url, data=post_data, method='POST')
                req.add_header('Content-Type', 'application/x-www-form-urlencoded')
                req.add_header('Accept', '*/*')
                
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    
                # 返回响应
                self.send_response(200)
                self.send_header('Content-Type', 'audio/mpeg')
                self.end_headers()
                self.wfile.write(data)
                
            else:
                self.send_error(404, "Proxy endpoint not found")
                
        except Exception as e:
            print(f"代理请求错误: {e}")
            self.send_error(500, f"Proxy error: {str(e)}")

def main():
    # 切换到项目目录
    os.chdir(current_dir)
    
    # 创建服务器
    with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        print(f"🚀 代理服务器启动成功！")
        print(f"📁 服务目录: {current_dir}")
        print(f"🌐 访问地址: http://localhost:{PORT}")
        print(f"🎤 TTS调试页面: http://localhost:{PORT}/standalone-tts-debug.html")
        print(f"🔧 原始调试页面: http://localhost:{PORT}/debug-baidu-tts.html")
        print(f"🔄 代理端点:")
        print(f"   - 百度Token: http://localhost:{PORT}/proxy/baidu-token")
        print(f"   - 百度TTS: http://localhost:{PORT}/proxy/baidu-tts")
        print(f"⏹️  按 Ctrl+C 停止服务器")
        print("-" * 50)
        
        # 自动打开浏览器
        try:
            webbrowser.open(f'http://localhost:{PORT}/standalone-tts-debug.html')
            print("✅ 已自动打开浏览器")
        except Exception as e:
            print(f"⚠️  无法自动打开浏览器: {e}")
            print("请手动访问上述地址")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 服务器已停止")
            sys.exit(0)

if __name__ == "__main__":
    main()
