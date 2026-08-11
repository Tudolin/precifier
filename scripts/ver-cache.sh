#!/bin/sh
# Mostra o que o Next guardou no cache de fetch (as leituras do banco).
for f in .next/cache/fetch-cache/*; do
  [ -f "$f" ] || continue
  echo "=== $f"
  echo "    modificado: $(stat -c %y "$f" | cut -d. -f1)  tamanho: $(stat -c %s "$f")"
  if grep -q "Macarr" "$f" 2>/dev/null; then echo "    >>> CONTEM 'Macarr' (dado de prato)"; fi
  if grep -q "LASANHA" "$f" 2>/dev/null; then echo "    >>> CONTEM 'LASANHA' (dado novo importado)"; fi
  if grep -q "precifier" "$f" 2>/dev/null; then echo "    >>> É uma leitura do banco KV"; fi
done
