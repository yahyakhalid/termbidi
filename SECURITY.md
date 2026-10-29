# Security policy

termbidi transforms text and escape sequences that other programs print, so
a bug could, for example, let crafted input produce escape sequences the
original text did not contain. Reports of that kind are especially welcome.

## Supported versions

Only the latest 0.x release receives fixes.

## Reporting a vulnerability

Please do **not** open a public issue. Use GitHub's private reporting:
[Report a vulnerability](https://github.com/yahyakhalid/termbidi/security/advisories/new).

Include the input that triggers the problem (as bytes or a JSON string), the
output you got, and what you expected. You should get a reply within 7 days.
This is a volunteer project with one maintainer, so fixes are best effort.
