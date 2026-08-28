# Nautica Home intro integration

The final landing is unchanged underneath a fixed full-screen intro shell.

## Approved intro source
The intro visual/UI files come from `nautica-temporal-landing-v11`:
- `intro.html`
- `css/intro.css`
- `js/intro-main.js`
- `js/firebase-newsletter.js`
- `assets/nautica-logo-white.png`
- `assets/nautica-logo-navy.png`

## Temporary development access
Enter exactly `nautica` in the intro newsletter field and press Subscribe. The intro fades out and the final landing is revealed. Access is stored under:

`sessionStorage["nautica_dev_access_v1"] = "1"`

This is a development convenience only, not a security mechanism.

## Video
The approved temporary V11 source ZIP does not contain the MP4. It expects the production video at:

`assets/hero-nautica.mp4`

Do not replace it with a dummy video. Place the approved production MP4 at that exact path when deploying.

## Firestore
Newsletter subscribers are written to `newsletterSubscribers`. Merge the rules in `firestore-newsletter.rules` into the existing Nautica Panel Firestore rules; do not replace unrelated rules.
