#!/bin/sh
curl -s -o /dev/null http://localhost:8801/index.html || (setsid nohup python3 -m http.server 8801 --directory /home/claude/qadam-city/dist >/dev/null 2>&1 &); sleep 1
