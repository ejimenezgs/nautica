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


## v111 - Intro video loader
- La intro muestra un spinner mientras el video inicial alcanza `loadeddata/canplay`.
- Cuando el video queda reproducible, el spinner se desvanece y aparece el contenido normal de la intro.
- Si el video produce `error`/`abort`, falta el elemento, o no queda listo en 8 segundos, la intro se omite y se revela la landing automáticamente.
- El fallback reutiliza el mismo controlador de entrada para conservar el bloqueo/desbloqueo de scroll y el fade existente.


## v112 video loader
- The intro loader now stays visible until the hero video dispatches real playback (`playing`/`timeupdate`).
- `video.load()` starts the preload request immediately.
- If playback never starts before the existing timeout/error fallback, the intro is skipped and the main landing is shown.

## v115 intro session reset
The temporary intro access session key was bumped from `nautica_dev_access_v1` to `nautica_dev_access_v2` so stale session state created by prior test builds cannot bypass the intro. Media/network fallback still skips only the current page load and does not persist access.
