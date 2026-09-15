#!/usr/bin/env bash
set -e
cd ~/Documents/03*/projectiq-infrastructure-designer 2>/dev/null || cd "$(dirname "$0")"
git apply --whitespace=nowarn reset-password.patch
git add -A
git commit -m "fix: el enlace de reset password terminaba en el login sin explicacion

El callback de correo solo atendia ?code= (PKCE). Los correos de recuperacion
llegan como token_hash + type=recovery, asi que nunca autenticaban y caian al
redirect final a /login. Encima el login descartaba el ?error= de la URL, de modo
que el fallo era mudo. Ahora el callback resuelve las dos formas via verifyOtp,
un enlace de recuperacion fallido vuelve a /forgot-password con el motivo, y
/reset-password comprueba la sesion al entrar en vez de fallar recien al guardar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ScqTACWd5u51GDZPenDDdM"
git push
echo ""
echo "Listo. Vercel esta desplegando."
