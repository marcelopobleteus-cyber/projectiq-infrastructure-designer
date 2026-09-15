#!/usr/bin/env bash
set -e
cd ~/Documents/03*/projectiq-infrastructure-designer 2>/dev/null || cd "$(dirname "$0")"
git apply --whitespace=nowarn financiero.patch
git add -A
git commit -m "feat: capa financiera del proyecto - contrato, facturas y pagos

Contrato -> facturas -> pagos, sin AIA, SOV, retencion ni ordenes de cambio.
Responde tres preguntas: cuanto se acordo, cuanto se facturo, cuanto se pago.
El vencimiento se deriva de los terminos del contrato y el estado de la factura
se deduce de los pagos, no se escribe a mano. Exporta CSV plano para cualquier
sistema contable. La ficha de clientes suma el por cobrar de sus proyectos.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ScqTACWd5u51GDZPenDDdM"
git push
echo ""
echo "Listo. Vercel esta desplegando."
