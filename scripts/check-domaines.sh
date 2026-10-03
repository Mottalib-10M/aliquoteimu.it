#!/bin/bash
# Disponibilité de domaines, interrogée au serveur whois du registre (RECETTE §16.1).
# Usage : check-domaines.sh domaine1.tld domaine2.tld …
# Toujours lancer d'abord sur un domaine connu pris (ex. google.com) : il doit répondre « pris ».
chk(){ d=$1; tld=${d##*.}; case $tld in
 sg) s=whois.sgnic.sg;; nz) s=whois.irs.net.nz;; no) s=whois.norid.no;; be) s=whois.dns.be;; dk) s=whois.punktum.dk;; com|net) s=whois.verisign-grs.com;; fr) s=whois.nic.fr;; de) s=whois.denic.de;; ch) s=whois.nic.ch;; nl) s=whois.domain-registry.nl;; ie) s=whois.weare.ie;; pt) s=whois.dns.pt;; es) s=whois.nic.es;; it) s=whois.nic.it;; se) s=whois.iis.se;; pl) s=whois.dns.pl;; ma) s=whois.registre.ma;; ca) s=whois.cira.ca;; mx) s=whois.mx;; us) s=whois.nic.us;; *) echo "?      $d (extension non gérée)"; return;; esac
 out=$(whois -h $s $d 2>&1)
 if echo "$out" | grep -qiE "not found|no match|no entries found|Status:\s*(AVAILABLE|free)|Domain Not Found|No Data Found|no object found|is free|nothing found"; then echo "LIBRE  $d"; else echo "pris   $d"; fi; sleep 1; }
for d in "$@"; do chk "$d"; done
